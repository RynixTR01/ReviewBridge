import { EXPIRE_BILLING_SQL } from "./billing-state.js";

export async function runBillingReconciliation({ query, refreshSubscription }) {
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
      const failedIds = rows.filter((_, index) => results[index].status === "rejected").map(row => row.id);
      if (failedIds.length) {
        // A manual retry must actually retry failures, not report an empty batch as success.
        await query(`UPDATE public.users SET billing_reconcile_attempted_at=NULL WHERE id=ANY($1::uuid[])`, [failedIds]);
        break;
      }
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

