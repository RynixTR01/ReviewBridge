import { Resend } from "resend";
import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email;
    if (!email) {
      return Response.json({ error: "Account email is unavailable" }, { status: 400 });
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!process.env.RESEND_API_KEY?.trim() || !from) {
      return Response.json({ success: true, skipped: true });
    }

    const claimed = await queryOne(
      `UPDATE public.users
       SET welcome_email_sent_at = NOW()
       WHERE id = $1 AND welcome_email_sent_at IS NULL
       RETURNING id`,
      [user.id]
    );
    if (!claimed) {
      const account = await queryOne(
        "SELECT welcome_email_sent_at FROM public.users WHERE id = $1",
        [user.id]
      );
      if (!account) {
        return Response.json({ error: "Account profile is unavailable" }, { status: 503 });
      }
      return Response.json({ success: true, duplicate: Boolean(account.welcome_email_sent_at) });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = escapeHtml((user.name || "there").trim().split(/\s+/)[0]);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app").replace(/\/$/, "");

    try {
      const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Welcome to ReviewBridge! 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${appUrl}/brand/reviewbridge-mark.png" alt="ReviewBridge" width="48" height="48" style="display: block; margin: 0 auto; border-radius: 12px;" />
          </div>
          <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 16px;">
            Welcome to ReviewBridge, ${firstName}!
          </h1>
          <p style="font-size: 16px; color: #64748b; line-height: 1.6; text-align: center; margin-bottom: 32px;">
            You're all set to start showing real reviews on your website. Here's how to get started:
          </p>
          <ol style="font-size: 15px; color: #334155; line-height: 1.8; padding-left: 20px; margin-bottom: 32px;">
            <li><strong>Connect</strong> your Google or Trustpilot listing</li>
            <li><strong>Customize</strong> your review widget</li>
            <li><strong>Embed</strong> it on your website with one line of code</li>
          </ol>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${appUrl}/dashboard"
               style="display: inline-block; padding: 14px 32px; background: #6366f1; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
              Go to Dashboard →
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      `,
      });
      if (error) throw error;
    } catch (emailError) {
      await queryOne(
        `UPDATE public.users SET welcome_email_sent_at = NULL
         WHERE id = $1 AND welcome_email_sent_at IS NOT NULL RETURNING id`,
        [user.id]
      );
      throw emailError;
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Welcome email delivery failed.", { name: err?.name });
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
