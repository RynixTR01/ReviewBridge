import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { extractTrustpilotDomain } from "@/app/lib/trustpilot";
import { startApifyRun, APIFY_ACTORS, buildGoogleMapsActorInput } from "@/app/lib/apify";
import { startSyncHistory, attachSyncRun, finishSyncHistory } from "@/lib/sync-history";
import { createStableReviewId } from "@/lib/review-id";
import { scheduleSyncRetry } from "@/lib/sync-retry";
import { normalizeReviewRating } from "@/lib/review-rating";

export async function POST(request, { params }) {
  let historyId = null;
  let currentSourceId = null;
  try {
    const resolvedParams = await params;
    const sourceId = resolvedParams.sourceId;

    if (!sourceId) {
      return Response.json({ error: "Source ID is required" }, { status: 400 });
    }

    const cronAuthorized = Boolean(process.env.CRON_SECRET)
      && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
    const user = cronAuthorized ? null : await getCurrentUser();

    if (!user && !cronAuthorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership of source
    const source = await queryOne(
      cronAuthorized
        ? 'SELECT * FROM public.sources WHERE id = $1'
        : `SELECT s.* FROM public.sources s
           LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
           JOIN public.users owner_profile ON owner_profile.id = s.user_id
           WHERE s.id = $1 AND (s.user_id = $2 OR (m.role = 'editor' AND owner_profile.plan = 'agency'))`,
      cronAuthorized ? [sourceId] : [sourceId, user.id]
    );

    if (!source) {
      return Response.json({ error: "Source not found or access denied" }, { status: 404 });
    }
    if (source.platform === "first_party") {
      return Response.json({ error: "Direct feedback does not use provider sync." }, { status: 400 });
    }

    // --- Sync Rate Limiting ---
    // Fetch user plan to determine cooldown
    const userId = source.user_id;
    const profile = await queryOne(
      'SELECT plan FROM public.users WHERE id = $1',
      [userId]
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
            ? `${Math.ceil(remainingMin / 60)} saat`
            : remainingMin >= 60
            ? `1 saat`
            : `${remainingMin} dakika`;
        return Response.json(
          { error: `Eşitleme için bekleme süresi dolmadı. ${remainingDisplay} sonra yeniden deneyin.` },
          { status: 429 }
        );
      }
    }
    // --- End Rate Limiting ---

    // Atomically claim the source so concurrent clicks cannot launch parallel
    // provider runs for the same source. Stuck claims become retryable after 15m.
    const syncClaim = await queryOne(
      `UPDATE public.sources
       SET sync_status = 'pending', sync_started_at = NOW(), last_sync_error = NULL,
           sync_retry_after = NULL,
           sync_retry_count = CASE WHEN $3::boolean THEN sync_retry_count ELSE 0 END
       WHERE id = $1 AND user_id = $2
         AND (sync_status IS DISTINCT FROM 'pending'
              OR sync_started_at IS NULL
              OR sync_started_at < NOW() - INTERVAL '15 minutes')
       RETURNING id`,
      [source.id, userId, cronAuthorized]
    );
    if (!syncClaim) {
      return Response.json(
        { error: "Bu kaynak için bir eşitleme zaten çalışıyor. Tamamlanmasını bekleyin." },
        { status: 409 }
      );
    }

    currentSourceId = source.id;
    historyId = await startSyncHistory(source.id);
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
          [source.id, runId, userId]
        );
        await attachSyncRun(historyId, runId);

        return Response.json({ status: 'pending', message: 'Syncing in background...' });
      } catch (err) {
        console.error("Failed to start Google sync:", err);
        await scheduleSyncRetry(query, source.id, "Eşitleme başlatılamadı.");
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Eşitleme başlatılamadı." });
        return Response.json({ error: "Eşitleme başlatılamadı." }, { status: 500 });
      }
    } else if (process.env.APIFY_API_TOKEN && source.platform === "trustpilot") {
      const companyDomain = extractTrustpilotDomain(source.place_id) || source.place_id;
      try {
        const runId = await startApifyRun(
          APIFY_ACTORS.TRUSTPILOT,
          { startUrls: [`https://www.trustpilot.com/review/${companyDomain}`], maxResults: 20 },
          source.id,
        );
        await query(
          `UPDATE public.sources SET apify_run_id = $2, sync_status = 'pending',
             sync_started_at = NOW(), last_sync_error = NULL WHERE id = $1 AND user_id = $3`,
          [source.id, runId, userId],
        );
        await attachSyncRun(historyId, runId);
        return Response.json({ status: "pending", message: "Trustpilot sync started in the background." });
      } catch (error) {
        console.error("Failed to start Trustpilot sync:", error);
        await scheduleSyncRetry(query, source.id, "Trustpilot eşitlemesi başlatılamadı.");
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Trustpilot eşitlemesi başlatılamadı." });
        return Response.json({ error: "Failed to start Trustpilot sync" }, { status: 502 });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock sync for demonstration
        fetchedReviews = [
          { reviewer_name: "New User " + Math.floor(Math.random() * 100), rating: 5, body: "Fresh review added!", reviewed_at: new Date().toISOString() }
        ];
      } else {
        await query(
          `UPDATE public.sources SET sync_status = 'error',
             last_sync_error = 'Apify anahtarı yapılandırılmamış.', sync_started_at = NULL
           WHERE id = $1`,
          [source.id]
        );
        await finishSyncHistory({ historyId, sourceId: source.id, status: "error", errorMessage: "Apify anahtarı yapılandırılmamış." });
        return Response.json(
          { error: "Apify anahtarı yapılandırılmamış." },
          { status: 500 }
        );
      }
    }

    // Map fetched results
    const reviewsToUpsert = fetchedReviews.slice(0, 20).map((r) => ({
      source_id: source.id,
      external_review_id: createStableReviewId(source.platform, r),
      reviewer_name: r.reviewer_name || "Anonymous",
      rating: normalizeReviewRating(r.rating),
      body: r.body || "",
      reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : new Date().toISOString(),
    })).filter((review) => review.rating !== null);

    const uniqueReviews = [...new Map(reviewsToUpsert.map((review) => [review.external_review_id, review])).values()];

    if (uniqueReviews.length > 0) {
      const values = [];
      const rows = uniqueReviews.map((review, index) => {
        const offset = index * 6;
        values.push(review.source_id, review.external_review_id, review.reviewer_name, review.rating, review.body, review.reviewed_at);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      });
      await query(
        `INSERT INTO public.reviews (source_id, external_review_id, reviewer_name, rating, body, reviewed_at)
         VALUES ${rows.join(', ')}
         ON CONFLICT (source_id, external_review_id) WHERE external_review_id IS NOT NULL
         DO UPDATE SET reviewer_name = EXCLUDED.reviewer_name, rating = EXCLUDED.rating,
           body = EXCLUDED.body, reviewed_at = EXCLUDED.reviewed_at`,
        values
      );
    }

    // Update last_synced_at
    await query(
      `UPDATE public.sources SET last_synced_at = NOW(), sync_status = 'done',
         last_sync_error = NULL, sync_started_at = NULL, sync_retry_count = 0,
         sync_retry_after = NULL
       WHERE id = $1 AND user_id = $2`,
      [source.id, userId]
    );

    await finishSyncHistory({ historyId, sourceId: source.id, status: "done", reviewsCount: uniqueReviews.length });
    return Response.json({ success: true, message: "Sync complete", updated: uniqueReviews.length });
  } catch (err) {
    if (currentSourceId) {
      try {
        await scheduleSyncRetry(query, currentSourceId, "Yorumlar kaydedilemedi veya eşitleme tamamlanamadı.");
      } catch (sourceUpdateError) {
        console.error("Could not mark source sync as failed:", sourceUpdateError);
      }
      await finishSyncHistory({ historyId, sourceId: currentSourceId, status: "error", errorMessage: "Eşitleme sırasında hata oluştu." });
    }
    console.error("Sync error:", err);
    return Response.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
