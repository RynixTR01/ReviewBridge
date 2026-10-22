import { getNeonClient, query } from "@/lib/db";
import { runMonitoredMaintenance } from "@/lib/maintenance-health";
import { EXPIRE_BILLING_SQL } from "@/lib/billing-state";
import { refreshSubscription } from "@/lib/billing";

export const maxDuration = 60;

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runMonitoredMaintenance(getNeonClient(), 'reconcile-billing', runReconciliation);
}

async function runReconciliation() {
  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    return Response.json({ error: "Billing reconciliation is not configured" }, { status: 503 });
  }
  try {
    const deadline = Date.now() + 40_000;
    await query(EXPIRE_BILLING_SQL, [null]);
    let succeeded = 0;
    let failed = 0;
    while (Date.now() < deadline) {
      const rows = await query(
      `WITH due AS (
         SELECT id FROM public.users WHERE lemonsqueezy_subscription_id IS NOT NULL
           AND (billing_reconcile_attempted_at IS NULL OR billing_reconcile_attempted_at < now() - INTERVAL '20 hours')
         ORDER BY billing_reconcile_attempted_at ASC NULLS FIRST, id
         LIMIT 4 FOR UPDATE SKIP LOCKED
       )
       UPDATE public.users SET billing_reconcile_attempted_at=now()
       WHERE id IN (SELECT id FROM due) RETURNING id`,
    );
      if (!rows.length) break;
      const results = await Promise.allSettled(rows.map(row => refreshSubscription(row.id)));
      succeeded += results.filter(r => r.status === "fulfilled").length;
      failed += results.filter(r => r.status === "rejected").length;
    }
    const [backlog] = await query(
      `SELECT EXISTS(SELECT 1 FROM public.users WHERE lemonsqueezy_subscription_id IS NOT NULL
       AND (billing_reconcile_attempted_at IS NULL OR billing_reconcile_attempted_at < now() - INTERVAL '20 hours')) AS pending`,
    );
    if (failed) console.error("Billing reconciliation needs attention.", { failed, succeeded });
    if (backlog?.pending) console.error("Billing reconciliation requires another run.");
    return Response.json({ succeeded, failed, pending: Boolean(backlog?.pending) }, { status: failed || backlog?.pending ? 503 : 200 });
  } catch (error) {
    console.error("Billing reconciliation failed.", { name: error?.name });
    return Response.json({ error: "Reconciliation unavailable" }, { status: 503 });
  }
}
