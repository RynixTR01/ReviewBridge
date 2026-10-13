import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { extractTrustpilotDomain } from "@/app/lib/trustpilot";
import { startApifyRun, APIFY_ACTORS, buildGoogleMapsActorInput } from "@/app/lib/apify";
import { startSyncHistory, attachSyncRun, finishSyncHistory } from "@/lib/sync-history";

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const sourceId = resolvedParams.sourceId;

    if (!sourceId) {
      return Response.json({ error: "Source ID is required" }, { status: 400 });
    }

    const user = await getCurrentUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership of source
    const source = await queryOne(
      'SELECT * FROM public.sources WHERE id = $1 AND user_id = $2',
      [sourceId, user.id]
    );

    if (!source) {
      return Response.json({ error: "Source not found or access denied" }, { status: 404 });
    }

    // --- Sync Rate Limiting ---
    // Fetch user plan to determine cooldown
    const profile = await queryOne(
      'SELECT plan FROM public.users WHERE id = $1',
      [user.id]
    );
    const userPlan = profile?.plan || 'free';

    const SYNC_COOLDOWNS_MS = {
      free:   86_400_000,  // 24 hours
      pro:     7_200_000,  // 2 hours
      agency:  1_800_000,  // 30 minutes
    };

    // Only a successful sync starts the cooldown. Stuck pending runs can be retried after 15 minutes.
    const pendingStartedAt = source.sync_started_at ? new Date(source.sync_started_at).getTime() : 0;
    const isStalePending = source.sync_status === "pending"
      && pendingStartedAt > 0
      && Date.now() - pendingStartedAt > 15 * 60_000;
    if (source.last_synced_at && source.sync_status !== "error" && !isStalePending) {
      const elapsed = Date.now() - new Date(source.last_synced_at).getTime();
      const cooldown = SYNC_COOLDOWNS_MS[userPlan] ?? SYNC_COOLDOWNS_MS.free;
      if (elapsed < cooldown) {
        const remainingMs = cooldown - elapsed;
        const remainingMin = Math.ceil(remainingMs / 60_000);
        const remainingDisplay =
          remainingMin >= 120
            ? `${Math.ceil(remainingMin / 60)} hours`
            : remainingMin >= 60
            ? `1 hour`
            : `${remainingMin} minute${remainingMin !== 1 ? 's' : ''}`;
        return Response.json(
          { error: `Sync is on cooldown. Available again in ${remainingDisplay}.` },
          { status: 429 }
        );
      }
    }
    // --- End Rate Limiting ---

    const historyId = await startSyncHistory(source.id);
    // Call Apify to fetch fresh reviews
    let fetchedReviews = [];

    if (process.env.APIFY_API_TOKEN && source.platform === "google") {
      try {
        const widget = await queryOne(
          "SELECT source_maps_url FROM public.widgets WHERE source_id = $1 LIMIT 1",
          [source.id]
        );
        const runId = await startApifyRun(
          APIFY_ACTORS.GOOGLE_MAPS,
          {
            ...buildGoogleMapsActorInput(source.place_id, widget?.source_maps_url),
            maxReviews: 20,
            reviewsSort: 'newest'
          },
          source.id
        );

        await query(
          `UPDATE public.sources
           SET apify_run_id = $2, sync_status = 'pending',
               sync_started_at = NOW(), last_sync_error = NULL
           WHERE id = $1 AND user_id = $3`,
          [source.id, runId, user.id]
        );
        await attachSyncRun(historyId, runId);

        return Response.json({ status: 'pending', message: 'Syncing in background...' });
      } catch (err) {
        console.error("Failed to start Google sync:", err);
        await query(
          `UPDATE public.sources
           SET sync_status = 'error', last_sync_error = $2,
               apify_run_id = NULL, sync_started_at = NULL
           WHERE id = $1 AND user_id = $3`,
          [source.id, "Failed to start sync process", user.id]
        );
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Eşitleme başlatılamadı." });
        return Response.json({ error: "Failed to start sync process" }, { status: 500 });
      }
    } else if (process.env.APIFY_API_TOKEN && source.platform === "trustpilot") {
      const companyDomain = extractTrustpilotDomain(source.place_id) || source.place_id;
      
      const tpRes = await fetch(
        'https://api.apify.com/v2/acts/memo23~trustpilot-scraper-ppe/run-sync-get-dataset-items?token=' + 
        process.env.APIFY_API_TOKEN + '&timeout=60',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: ['https://www.trustpilot.com/review/' + companyDomain],
            maxResults: 20
          })
        }
      );
      
      if (tpRes.ok) {
        const tpData = await tpRes.json();
        if (Array.isArray(tpData)) {
          fetchedReviews = tpData.map(item => ({
            reviewer_name: item.consumer?.displayName || 'Anonymous',
            rating: item.rating || 0,
            body: item.text || null,
            reviewed_at: item.dates?.publishedDate || new Date().toISOString()
          }));
        } else {
          console.error("Trustpilot Apify fetch failed (array not returned)", tpData);
          await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Trustpilot yanıtı okunamadı." });
          return Response.json({ error: "Failed to parse Trustpilot results from Apify" }, { status: 502 });
        }
      } else {
        console.error("Trustpilot Apify fetch failed", await tpRes.text());
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Trustpilot yorumları alınamadı." });
        return Response.json({ error: "Failed to fetch from Apify (Trustpilot)" }, { status: 502 });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock sync for demonstration
        fetchedReviews = [
          { reviewer_name: "New User " + Math.floor(Math.random() * 100), rating: 5, body: "Fresh review added!", reviewed_at: new Date().toISOString() }
        ];
      } else {
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Apify anahtarı yapılandırılmamış." });
        return Response.json(
          { error: "Apify token is not configured. Add APIFY_API_TOKEN to your environment variables." },
          { status: 500 }
        );
      }
    }

    // Map fetched results
    const reviewsToUpsert = fetchedReviews.slice(0, 20).map((r) => ({
      source_id: source.id,
      reviewer_name: r.reviewer_name || "Anonymous",
      rating: r.rating || 5,
      body: r.body || "",
      reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date().toISOString(),
      // We don't have a unique foreign ID constraint defined in the schema to properly upsert without duplicates easily,
      // so for this MVP, we might just insert them. Ideally we would match by an external ID or reviewer_name.
      // We will perform an insert. 
    }));

    if (reviewsToUpsert.length > 0) {
      const values = [];
      const rows = reviewsToUpsert.map((review, index) => {
        const offset = index * 5;
        values.push(review.source_id, review.reviewer_name, review.rating, review.body, review.reviewed_at);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      });
      try {
        await query(
          `INSERT INTO public.reviews (source_id, reviewer_name, rating, body, reviewed_at)
           VALUES ${rows.join(', ')}
           ON CONFLICT (source_id, reviewer_name, reviewed_at) DO NOTHING`,
          values
        );
      } catch (insertError) {
        console.error("Reviews insert error:", insertError);
      }
    }

    // Update last_synced_at
    try {
      await query(
        'UPDATE public.sources SET last_synced_at = NOW() WHERE id = $1 AND user_id = $2',
        [source.id, user.id]
      );
    } catch (updateError) {
      console.error("Source update error:", updateError);
    }

    await finishSyncHistory({ historyId, sourceId: source.id, status: "done", reviewsCount: reviewsToUpsert.length });
    return Response.json({ success: true, message: "Sync complete", updated: reviewsToUpsert.length });
  } catch (err) {
    console.error("Sync error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
