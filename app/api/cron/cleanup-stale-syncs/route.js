import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  try {
    // We only allow GET requests. In Vercel, cron jobs hit the endpoint via GET.
    // Ensure we are authorized. Vercel cron jobs send a secure header.
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS for background cleanup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate the threshold time: 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Find sources stuck in 'pending' for more than 15 minutes and mark as error
    const { data, error } = await supabase
      .from('sources')
      .update({
        sync_status: 'error',
        last_sync_error: 'Sync timed out. Please try again.',
        apify_run_id: null
      })
      .eq('sync_status', 'pending')
      .not('sync_started_at', 'is', null)
      .lt('sync_started_at', fifteenMinutesAgo)
      .select('id');

    if (error) {
      console.error('Cleanup Cron DB Error:', error);
      return Response.json({ error: 'Database update failed' }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: `Cleaned up ${data?.length || 0} stale syncs.` 
    }, { status: 200 });

  } catch (err) {
    console.error('Cleanup Cron Error:', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
