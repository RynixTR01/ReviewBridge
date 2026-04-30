import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';
import { getDatasetItems, mapApifyReviews, APIFY_ACTORS } from "@/app/lib/apify";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const querySecret = searchParams.get('secret');
    const headerSecret = request.headers.get('x-webhook-secret');
    
    const providedSecret = headerSecret || querySecret;
    const expectedSecret = process.env.APIFY_WEBHOOK_SECRET;

    if (!sourceId) {
      return Response.json({ error: 'Missing sourceId' }, { status: 400 });
    }

    if (!expectedSecret || !providedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedBuffer = Buffer.from(expectedSecret, 'utf8');
    const providedBuffer = Buffer.from(providedSecret, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const eventType = body.eventType;
    const resource = body.resource;
    
    if (!resource || !resource.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const runId = resource.id;
    const actId = resource.actId;
    const runStatus = resource.status; // SUCCEEDED, FAILED, TIMED_OUT, ABORTED

    // Use service role to bypass RLS since this is a background webhook
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the source actually exists and matches the runId
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, apify_run_id, platform')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.apify_run_id !== runId) {
       // Run ID mismatch (maybe a stale run finished late, or a new run started)
       return Response.json({ message: 'Ignored: run ID mismatch' }, { status: 200 });
    }

    if (runStatus !== 'SUCCEEDED') {
      await supabase
        .from('sources')
        .update({
          sync_status: 'error',
          last_sync_error: `Apify run ended with status: ${runStatus}`,
          apify_run_id: null,
          sync_started_at: null
        })
        .eq('id', sourceId);
      
      return Response.json({ message: `Run failed with status ${runStatus}` }, { status: 200 });
    }

    try {
      // Run Succeeded. Fetch dataset and process reviews.
      const rawItems = await getDatasetItems(runId);
      
      const platform = source.platform || (actId === APIFY_ACTORS.GOOGLE_MAPS ? 'google' : 'trustpilot');
      const mappedReviews = mapApifyReviews(rawItems, platform);

      if (mappedReviews.length > 0) {
        // Only insert columns that exist in the Supabase schema
        const reviewsToInsert = mappedReviews.map(r => ({
          source_id: sourceId,
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          body: r.body,
          reviewed_at: r.reviewed_at
        }));

        // Use the proper array format for onConflict
        const { error: upsertError } = await supabase
          .from('reviews')
          .upsert(reviewsToInsert, { 
            onConflict: ['source_id', 'reviewer_name', 'reviewed_at'], 
            ignoreDuplicates: true 
          });

        if (upsertError) throw upsertError;
      }

      // Mark sync as done
      await supabase
        .from('sources')
        .update({
          sync_status: 'done',
          apify_run_id: null,
          sync_started_at: null,
          last_synced_at: new Date().toISOString(),
          last_sync_error: null
        })
        .eq('id', sourceId);

      console.log(`Successfully synced ${mappedReviews.length} reviews for source ${sourceId}`);

      return Response.json({ success: true, count: mappedReviews.length }, { status: 200 });
    } catch (processError) {
      // Catch errors during fetching or DB inserting
      console.error('Error processing reviews:', processError);
      
      await supabase
        .from('sources')
        .update({
          sync_status: 'error',
          last_sync_error: `Failed to process reviews: ${processError.message}`,
          apify_run_id: null,
          sync_started_at: null
        })
        .eq('id', sourceId);

      return Response.json({ error: 'Failed to process reviews' }, { status: 500 });
    }

  } catch (err) {
    console.error('Apify Webhook Error:', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
