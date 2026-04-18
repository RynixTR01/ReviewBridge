import { createClient } from "@/lib/supabase/server";

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

    // Call Apify to fetch fresh reviews
    let fetchedReviews = [];
    if (process.env.APIFY_API_TOKEN && source.platform === "google") {
      const res = await fetch(`https://api.apify.com/v2/acts/Xb8osYTtOjlsgI6k9/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeIds: [source.place_id],
          maxReviews: 20,
          reviewsSort: 'newest',
          language: 'tr'
        })
      });
      if (res.ok) {
        const data = await res.json();
        fetchedReviews = data.map(item => ({
          reviewer_name: item.name,
          rating: item.stars,
          body: item.text,
          reviewed_at: item.publishedAtDate
        }));
      } else {
        console.error("Apify fetch failed", await res.text());
        return Response.json({ error: "Failed to fetch from Apify" }, { status: 502 });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Mock sync for demonstration/Trustpilot
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
