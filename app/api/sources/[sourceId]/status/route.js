import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { finishSyncHistory } from "@/lib/sync-history";

export async function GET(request, { params }) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;

    // Editors can inspect sync status only for brands explicitly shared with them.
    const source = await queryOne(
      `SELECT s.user_id, s.sync_status, s.sync_started_at, s.last_synced_at, s.last_sync_error
       FROM public.sources s
       LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $2
       JOIN public.users owner_profile ON owner_profile.id = s.user_id
       WHERE s.id = $1 AND (s.user_id = $2 OR (m.role = 'editor' AND owner_profile.plan = 'agency'))`,
      [sourceId, user.id]
    );

    if (!source) {
      return Response.json({ error: "Source not found" }, { status: 404 });
    }

    const startedAt = source.sync_started_at ? new Date(source.sync_started_at).getTime() : 0;
    if (source.sync_status === "pending" && startedAt > 0 && Date.now() - startedAt > 15 * 60_000) {
      await query(
        `UPDATE public.sources
         SET sync_status = 'error', last_sync_error = $3,
             apify_run_id = NULL, sync_started_at = NULL
         WHERE id = $1 AND user_id = $2 AND sync_status = 'pending'
           AND sync_started_at < NOW() - INTERVAL '15 minutes'`,
        [sourceId, source.user_id, "Sync timed out. Please try again."]
      );
      await finishSyncHistory({ sourceId, status: "error", errorMessage: "Eşitleme zaman aşımına uğradı." });
    }

    const currentSource = await queryOne(
      `SELECT sync_status, last_synced_at, last_sync_error
       FROM public.sources WHERE id = $1 AND user_id = $2`,
      [sourceId, source.user_id]
    );

    return Response.json({
      sync_status: currentSource.sync_status,
      last_synced_at: currentSource.last_synced_at,
      last_sync_error: currentSource.last_sync_error
    }, { status: 200 });

  } catch (error) {
    console.error("Source status request failed.", { name: error?.name });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
