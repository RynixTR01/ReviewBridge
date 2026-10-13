import crypto from 'crypto';
import { getDatasetItems, mapApifyReviews, APIFY_ACTORS } from "@/app/lib/apify";
import { query, queryOne } from "@/lib/db";
import { finishSyncHistory } from "@/lib/sync-history";
import { createStableReviewId } from "@/lib/review-id";
import { scheduleSyncRetry } from "@/lib/sync-retry";

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

    // Verify the source actually exists and matches the runId
    const source = await queryOne(
      'SELECT id, apify_run_id, platform FROM public.sources WHERE id = $1',
      [sourceId]
    );

    if (!source) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.apify_run_id !== runId) {
       // Run ID mismatch (maybe a stale run finished late, or a new run started)
       return Response.json({ message: 'Ignored: run ID mismatch' }, { status: 200 });
    }

    if (runStatus !== 'SUCCEEDED') {
      await scheduleSyncRetry(query, sourceId, `Apify run ended with status: ${runStatus}`);
      
      await finishSyncHistory({ sourceId, runId, status: "error", errorMessage: `Apify run ended with status: ${runStatus}` });
      return Response.json({ message: `Run failed with status ${runStatus}` }, { status: 200 });
    }

    try {
      // Run Succeeded. Fetch dataset and process reviews.
      const rawItems = await getDatasetItems(runId);
      
      const platform = source.platform || (actId === APIFY_ACTORS.GOOGLE_MAPS ? 'google' : 'trustpilot');
      const mappedReviews = mapApifyReviews(rawItems, platform);
      const businessTitle = platform === 'google' && Array.isArray(rawItems)
        ? rawItems.find((item) => typeof item?.title === 'string' && item.title.trim())?.title.trim() || null
        : null;

      if (mappedReviews.length > 0) {
        const values = [];
        const rows = mappedReviews.map((review, index) => {
          const offset = index * 6;
          values.push(sourceId, createStableReviewId(platform, review), review.reviewer_name, review.rating, review.body, review.reviewed_at);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
        });
        await query(
          `INSERT INTO public.reviews (source_id, external_review_id, reviewer_name, rating, body, reviewed_at)
           VALUES ${rows.join(', ')}
           ON CONFLICT DO NOTHING`,
          values
        );
      }

      // Mark sync as done
      await query(
        `UPDATE public.sources
         SET sync_status = 'done', apify_run_id = NULL, sync_started_at = NULL,
             last_synced_at = NOW(), last_sync_error = NULL,
             sync_retry_count = 0, sync_retry_after = NULL,
             business_name = CASE
               WHEN business_name IN ('Google işletmesi (eşitleniyor...)', 'Google Business (Syncing...)', 'Google Business', 'Bilinmeyen işletme')
                 AND $2::text IS NOT NULL THEN $2
               ELSE business_name
             END
         WHERE id = $1`,
        [sourceId, businessTitle]
      );

      await finishSyncHistory({ sourceId, runId, status: "done", reviewsCount: mappedReviews.length });
      console.log(`Successfully synced ${mappedReviews.length} reviews for source ${sourceId}`);

      return Response.json({ success: true, count: mappedReviews.length }, { status: 200 });
    } catch (processError) {
      // Catch errors during fetching or DB inserting
      console.error('Error processing reviews:', processError);
      
      await scheduleSyncRetry(query, sourceId, `Failed to process reviews: ${processError.message}`);
      await finishSyncHistory({ sourceId, runId, status: "error", errorMessage: "Yorumlar işlenirken eşitleme başarısız oldu." });

      return Response.json({ error: 'Failed to process reviews' }, { status: 500 });
    }

  } catch (err) {
    console.error('Apify Webhook Error:', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
