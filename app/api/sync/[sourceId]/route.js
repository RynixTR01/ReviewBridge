import { createClient } from "@/lib/supabase/server";
import { extractTrustpilotDomain } from "@/app/lib/trustpilot";
import { startApifyRun, APIFY_ACTORS } from "@/app/lib/apify";

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const sourceId = resolvedParams.sourceId;

    if (!sourceId) {
      return Response.json({ error: "Source ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership of source
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .single();

    if (sourceError || !source) {
      return Response.json({ error: "Source not found or access denied" }, { status: 404 });
    }

    // --- Sync Rate Limiting ---
    // Fetch user plan to determine cooldown
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();
    const userPlan = profile?.plan || 'free';

    const SYNC_COOLDOWNS_MS = {
      free:   86_400_000,  // 24 hours
      pro:     7_200_000,  // 2 hours
      agency:  1_800_000,  // 30 minutes
    };

    if (source.last_synced_at) {
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

    // Call Apify to fetch fresh reviews
    let fetchedReviews = [];

    if (process.env.APIFY_API_TOKEN && source.platform === "google") {
      try {
        const runId = await startApifyRun(
          APIFY_ACTORS.GOOGLE_MAPS,
          {
            placeIds: [source.place_id],
            maxReviews: 20,
            reviewsSort: 'newest'
          },
          source.id
        );

        await supabase
          .from('sources')
          .update({
            apify_run_id: runId,
            sync_status: 'pending',
            sync_started_at: new Date().toISOString(),
            last_sync_error: null
          })
          .eq('id', source.id);

        return Response.json({ status: 'pending', message: 'Syncing in background...' });
      } catch (err) {
        console.error("Failed to start Google sync:", err);
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
          return Response.json({ error: "Failed to parse Trustpilot results from Apify" }, { status: 502 });
        }
      } else {
        console.error("Trustpilot Apify fetch failed", await tpRes.text());
        return Response.json({ error: "Failed to fetch from Apify (Trustpilot)" }, { status: 502 });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock sync for demonstration
        fetchedReviews = [
          { reviewer_name: "New User " + Math.floor(Math.random() * 100), rating: 5, body: "Fresh review added!", reviewed_at: new Date().toISOString() }
        ];
      } else {
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
      const { error: insertError } = await supabase
        .from("reviews")
        .upsert(reviewsToUpsert, { onConflict: 'source_id,reviewer_name,reviewed_at' });

      if (insertError) {
        console.error("Reviews insert error:", insertError);
      }
    }

    // Update last_synced_at
    const { error: updateError } = await supabase
      .from("sources")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", source.id);

    if (updateError) {
      console.error("Source update error:", updateError);
    }

    return Response.json({ success: true, message: "Sync complete", updated: reviewsToUpsert.length });
  } catch (err) {
    console.error("Sync error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
