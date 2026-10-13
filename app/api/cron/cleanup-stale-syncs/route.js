import { query } from "@/lib/db";
import { finishSyncHistory } from "@/lib/sync-history";

export async function GET(request) {
  try {
    // We only allow GET requests. In Vercel, cron jobs hit the endpoint via GET.
    // Ensure we are authorized. Vercel cron jobs send a secure header.
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the threshold time: 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Find sources stuck in 'pending' for more than 15 minutes and mark as error
    const data = await query(
      `UPDATE public.sources
       SET sync_status = 'error', last_sync_error = 'Sync timed out. Please try again.',
           apify_run_id = NULL
       WHERE sync_status = 'pending'
         AND sync_started_at IS NOT NULL
         AND sync_started_at < $1
       RETURNING id`,
      [fifteenMinutesAgo]
    );

    await Promise.all((data || []).map(({ id }) =>
      finishSyncHistory({ sourceId: id, status: "error", errorMessage: "Eşitleme zaman aşımına uğradı." })
    ));

    return Response.json({ 
      success: true, 
      message: `Cleaned up ${data.length} stale syncs.`
    }, { status: 200 });

  } catch (err) {
    console.error('Cleanup Cron Error:', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
