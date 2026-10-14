import { Resend } from "resend";
import { query, queryOne } from "@/lib/db";
import { CLAIM_SYNC_ALERT_SQL } from "./sync-alert-query";

export async function deliverSyncFailureAlerts() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from || !from.includes("@")) return { sent: 0, failed: 0, skipped: true };

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const alert = await queryOne(CLAIM_SYNC_ALERT_SQL);
    if (!alert) break;
    try {
      const url = new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app").toString();
      const result = await resend.emails.send({
        from,
        to: alert.email,
        subject: "ReviewBridge: source sync needs attention",
        text: `The automatic review sync for ${alert.business_name} still failed after retry attempts. Your existing reviews remain available. Check the source status and retry from your dashboard: ${url}\n\nYou can turn off these emails in Settings.`,
      });
      if (result.error) throw result.error;
      await query("UPDATE public.sync_history SET alert_sent_at = now() WHERE id = $1", [alert.id]);
      sent += 1;
    } catch {
      await query("UPDATE public.sync_history SET alert_claimed_at = NULL WHERE id = $1", [alert.id]);
      failed += 1;
      break;
    }
  }
  return { sent, failed };
}
