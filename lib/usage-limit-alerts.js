import { Resend } from "resend";
import { query, queryOne } from "@/lib/db";
import { buildUsageLimitEmail } from "@/lib/usage-limit-email-copy";

export async function sendUsageLimitAlert({ userId, count, limit, locale = "tr" }) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from || !from.includes("@")) return false;

  let claim;
  try {
    claim = await queryOne(
      `UPDATE public.users
       SET usage_limit_email_sent_at = now()
       WHERE id = $1
         AND usage_limit_emails_enabled = true
         AND email IS NOT NULL
         AND (usage_limit_email_sent_at IS NULL OR usage_limit_email_sent_at < now() - INTERVAL '30 days')
       RETURNING email, usage_limit_email_sent_at`,
      [userId],
    );
  } catch {
    console.warn("Usage limit email could not be claimed.");
    return false;
  }
  if (!claim) return false;

  try {
    const upgradeUrl = new URL("/dashboard/upgrade", process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app").toString();
    const message = buildUsageLimitEmail({ locale, count, limit, upgradeUrl });
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to: claim.email,
      ...message,
    });
    if (result.error) throw result.error;
    return true;
  } catch {
    try {
      await query(
        "UPDATE public.users SET usage_limit_email_sent_at = NULL WHERE id = $1 AND usage_limit_email_sent_at = $2",
        [userId, claim.usage_limit_email_sent_at],
      );
    } catch {
      // The alert is optional; do not replace the plan-limit response with an email error.
    }
    console.warn("Usage limit email delivery failed.");
    return false;
  }
}
