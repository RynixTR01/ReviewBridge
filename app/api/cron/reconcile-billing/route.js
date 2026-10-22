import { getNeonClient, query } from "@/lib/db";
import { runMonitoredMaintenance } from "@/lib/maintenance-health";
import { runBillingReconciliation } from "@/lib/billing-reconciliation";
import { refreshSubscription } from "@/lib/billing";

export const maxDuration = 60;

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runMonitoredMaintenance(getNeonClient(), 'reconcile-billing', () => runBillingReconciliation({ query, refreshSubscription }));
}


