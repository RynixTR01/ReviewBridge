export const MAX_SYNC_RETRIES = 3;

export function getSyncRetryDelayMs(retryCount) {
  const delays = [15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
  const index = Math.min(Math.max(Number(retryCount) - 1, 0), delays.length - 1);
  return delays[index];
}

export async function scheduleSyncRetry(query, sourceId, errorMessage) {
  await query(
    `UPDATE public.sources
     SET sync_status = 'error',
         last_sync_error = $2,
         apify_run_id = NULL,
         sync_started_at = NULL,
         sync_retry_count = CASE WHEN sync_retry_count < $3 THEN sync_retry_count + 1 ELSE sync_retry_count END,
         sync_retry_after = CASE
           WHEN sync_retry_count < $3
             THEN NOW() + (CASE sync_retry_count
               WHEN 0 THEN INTERVAL '15 minutes'
               WHEN 1 THEN INTERVAL '1 hour'
               ELSE INTERVAL '6 hours'
             END)
           ELSE NULL
         END
     WHERE id = $1`,
    [sourceId, String(errorMessage || "Eşitleme başarısız oldu.").slice(0, 500), MAX_SYNC_RETRIES],
  );
}
