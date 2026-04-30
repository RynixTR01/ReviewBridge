import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = params;

    // Fetch source status
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('sync_status, last_synced_at, last_sync_error, user_id')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return Response.json({ error: "Source not found" }, { status: 404 });
    }

    // Ensure the user owns this source
    if (source.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({
      sync_status: source.sync_status,
      last_synced_at: source.last_synced_at,
      last_sync_error: source.last_sync_error
    }, { status: 200 });

  } catch (error) {
    console.error("Status Endpoint Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
