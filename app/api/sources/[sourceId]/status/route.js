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

    // Scope by owner in SQL so the Neon connection cannot bypass the old RLS policy.
    const source = await queryOne(
      `SELECT sync_status, sync_started_at, last_synced_at, last_sync_error
       FROM public.sources WHERE id = $1 AND user_id = $2`,
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
        [sourceId, user.id, "Sync timed out. Please try again."]
      );
      await finishSyncHistory({ sourceId, status: "error", errorMessage: "Eşitleme zaman aşımına uğradı." });
    }

    const currentSource = await queryOne(
      `SELECT sync_status, last_synced_at, last_sync_error
       FROM public.sources WHERE id = $1 AND user_id = $2`,
      [sourceId, user.id]
    );

    return Response.json({
      sync_status: currentSource.sync_status,
      last_synced_at: currentSource.last_synced_at,
      last_sync_error: currentSource.last_sync_error
    }, { status: 200 });

  } catch (error) {
    console.error("Status Endpoint Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
