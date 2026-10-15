import { createHash } from "node:crypto";
import { queryOne } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request, { params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(String(token || ""))) return Response.json({ ok: true });
  if (await isRateLimited(request, "survey-invitation-unsubscribe", { limit: 20, windowMs: 60 * 60 * 1000 })) {
    return Response.json({ error: "Please try again later." }, { status: 429 });
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await queryOne(
    `WITH opted_out AS (
       UPDATE public.survey_invitations invitation
       SET status = 'unsubscribed', recipient_email = NULL, unsubscribe_token = NULL,
           claimed_at = NULL, last_error_code = NULL
       WHERE invitation.unsubscribe_token_hash = $1
         AND (invitation.status IN ('pending', 'sent')
           OR (invitation.status = 'failed' AND invitation.last_error_code = 'delivery_unknown'))
       RETURNING invitation.user_id, invitation.recipient_fingerprint
     ), suppressed AS (
       INSERT INTO public.survey_invitation_suppressions (user_id, recipient_fingerprint)
       SELECT user_id, recipient_fingerprint FROM opted_out
       ON CONFLICT (user_id, recipient_fingerprint) DO NOTHING
       RETURNING user_id
     )
     SELECT count(*)::int AS updated FROM opted_out`,
    [tokenHash],
  );
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
