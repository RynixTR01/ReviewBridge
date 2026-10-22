import { randomUUID } from "node:crypto";

export const MAINTENANCE_HEALTH_SQL = `
  SELECT count(*)=2 AND bool_and(
    status<>'failed'
    AND (status<>'running' OR started_at > now()-interval '5 minutes')
    AND coalesce(succeeded_at,created_at) > now()-interval '36 hours'
  ) AS healthy FROM public.maintenance_job_health
  WHERE job_name IN ('cleanup-stale-syncs','reconcile-billing')`;

/** Persist completion so a missing or timed-out cron cannot look healthy. */
export async function runMonitoredMaintenance(database, name, run) {
  if (!["cleanup-stale-syncs", "reconcile-billing"].includes(name)) throw new Error("Unknown maintenance job");
  const token = randomUUID();
  const [claimed] = await database.query(
    `UPDATE public.maintenance_job_health SET run_token=$2,started_at=now(),status='running'
     WHERE job_name=$1 AND (status<>'running' OR started_at<now()-interval '2 minutes')
     RETURNING job_name`, [name, token],
  );
  if (!claimed) return Response.json({ error: "Maintenance already running or not initialized" }, { status: 503 });
  async function finish(ok) {
    await database.query(
      `UPDATE public.maintenance_job_health SET status=$3,finished_at=now(),
       succeeded_at=CASE WHEN $4::boolean THEN now() ELSE succeeded_at END
       WHERE job_name=$1 AND run_token=$2`, [name, token, ok ? 'success' : 'failed', ok],
    );
  }
  try {
    const result = await run();
    await finish(result.ok);
    return result;
  } catch {
    try { await finish(false); } catch { /* stale running state is detected by health */ }
    return Response.json({ error: "Maintenance unavailable" }, { status: 503 });
  }
}
