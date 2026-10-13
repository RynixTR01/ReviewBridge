import { query } from "@/lib/db";

export async function startSyncHistory(sourceId) {
  try {
    const rows = await query(
      "INSERT INTO public.sync_history (source_id, status, started_at) VALUES ($1, 'pending', NOW()) RETURNING id",
      [sourceId]
    );
    return rows?.[0]?.id || null;
  } catch (error) {
    console.warn("Sync history unavailable; apply its migration.", error?.message);
    return null;
  }
}

export async function attachSyncRun(historyId, runId) {
  if (!historyId || !runId) return;
  try {
    await query("UPDATE public.sync_history SET apify_run_id = $2 WHERE id = $1", [historyId, runId]);
  } catch (error) {
    console.warn("Could not attach Apify run to sync history.", error?.message);
  }
}

export async function finishSyncHistory({ historyId, sourceId, runId, status, reviewsCount = 0, errorMessage = null }) {
  if (!["done", "error"].includes(status)) return;
  try {
    await query(
      "UPDATE public.sync_history SET status = $2, completed_at = NOW(), reviews_count = $3, error_message = $4 " +
      "WHERE id = COALESCE($1::uuid, (SELECT id FROM public.sync_history WHERE source_id = $5 AND status = 'pending' " +
      "AND ($6::text IS NULL OR apify_run_id = $6) ORDER BY started_at DESC LIMIT 1))",
      [historyId || null, status, reviewsCount, errorMessage, sourceId, runId || null]
    );
  } catch (error) {
    console.warn("Could not update sync history.", error?.message);
  }
}
