import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, fullName } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const firstName = fullName ? fullName.split(" ")[0] : "there";

    await resend.emails.send({
      from: "ReviewBridge <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to ReviewBridge! 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #0ea5e9); color: white; font-size: 20px; font-weight: bold; line-height: 48px;">R</div>
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
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://reviewbridge.com' : 'http://localhost:3000'}/dashboard"
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

    return Response.json({ success: true });
  } catch (err) {
    console.error("Welcome email error:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
