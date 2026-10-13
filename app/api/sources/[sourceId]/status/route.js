import { createClient } from "@/lib/supabase/server";
import { queryOne } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;

    // Scope by owner in SQL so the Neon connection cannot bypass the old RLS policy.
    const source = await queryOne(
      `SELECT sync_status, last_synced_at, last_sync_error
       FROM public.sources WHERE id = $1 AND user_id = $2`,
      [sourceId, user.id]
    );

    if (!source) {
      return Response.json({ error: "Source not found" }, { status: 404 });
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
