import { Resend } from "resend";
import { query, queryOne } from "@/lib/db";

export async function deliverDueSurveyInvitations({ limit = 20, maxDurationMs = 25_000 } = {}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from || !from.includes("@")) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
  const deadline = Date.now() + Math.min(30_000, Math.max(1_000, maxDurationMs));
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < Math.min(20, Math.max(0, limit)); index += 1) {
    const remaining = deadline - Date.now();
    if (remaining < 10_000) break;
    const invitation = await queryOne(
      `WITH candidate AS (
         SELECT invitation.id
         FROM public.survey_invitations invitation
         JOIN public.survey_invitation_campaigns campaign ON campaign.id = invitation.campaign_id
         WHERE invitation.status = 'pending'
           AND invitation.next_attempt_at <= now()
           AND invitation.attempt_count < 3
           AND campaign.status = 'scheduled'
           AND campaign.scheduled_at <= now()
           AND invitation.claimed_at IS NULL
         ORDER BY campaign.scheduled_at, invitation.created_at
         FOR UPDATE OF invitation, campaign SKIP LOCKED
         LIMIT 1
       )
       UPDATE public.survey_invitations invitation
       SET claimed_at = now()
       FROM candidate, public.survey_invitation_campaigns campaign, public.customer_surveys survey
       WHERE invitation.id = candidate.id
         AND campaign.id = invitation.campaign_id
         AND survey.id = campaign.survey_id
       RETURNING invitation.id, invitation.user_id, invitation.recipient_email,
                 invitation.unsubscribe_token, campaign.locale, survey.title AS survey_title,
                 survey.public_token`,
      [],
    );
    if (!invitation) break;

    const surveyUrl = new URL(`/survey/${invitation.public_token}`, baseUrl).toString();
    const unsubscribeUrl = new URL(`/unsubscribe/survey/${invitation.unsubscribe_token}`, baseUrl).toString();
    const oneClickUnsubscribeUrl = new URL(`/api/survey-invitations/unsubscribe/${invitation.unsubscribe_token}`, baseUrl).toString();
    const english = invitation.locale === "en";
    try {
      const result = await resend.emails.send({
        from,
        to: invitation.recipient_email,
        subject: english ? "A private customer feedback survey" : "Kısa müşteri geri bildirim anketi",
        text: english
          ? `You were invited to share private feedback about ${invitation.survey_title}. Your response goes only to the business and is not posted publicly.\n\nAnswer the survey: ${surveyUrl}\n\nIf you do not want future survey invitations from this business, opt out here: ${unsubscribeUrl}`
          : `${invitation.survey_title} hakkında özel geri bildiriminizi paylaşmanız için davet edildiniz. Yanıtınız yalnızca işletmeye iletilir ve herkese açık paylaşılmaz.\n\nAnketi yanıtlayın: ${surveyUrl}\n\nBu işletmeden yeni anket daveti almak istemiyorsanız buradan durdurabilirsiniz: ${unsubscribeUrl}`,
        headers: {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }, {
        idempotencyKey: `survey-invitation/${invitation.id}`,
        signal: AbortSignal.timeout(Math.min(8_000, Math.max(1_000, deadline - Date.now() - 2_000))),
      });
      if (result.error) {
        if (Number(result.error.statusCode) === 429) {
          // A rate-limit response confirms that this request was rejected.
          await query(
            `UPDATE public.survey_invitations
             SET attempt_count = LEAST(attempt_count + 1, 3),
                 status = CASE WHEN attempt_count + 1 >= 3 THEN 'failed' ELSE 'pending' END,
                 next_attempt_at = now() + interval '1 day',
                 unsubscribe_token = CASE WHEN attempt_count + 1 >= 3 THEN NULL ELSE unsubscribe_token END,
                 claimed_at = NULL, last_error_code = 'rate_limited'
             WHERE id = $1 AND status = 'pending'`,
            [invitation.id],
          );
        } else {
          // The provider may have accepted a request before a timeout or 5xx.
          // Keep the unsubscribe token, and do not retry a possibly sent email.
          await query(
            `UPDATE public.survey_invitations
             SET attempt_count = LEAST(attempt_count + 1, 3), status = 'failed',
                 claimed_at = NULL, last_error_code = 'delivery_unknown'
             WHERE id = $1 AND status = 'pending'`,
            [invitation.id],
          );
        }
        failed += 1;
        break;
      }
      await query(
        `UPDATE public.survey_invitations
         SET status = 'sent', recipient_email = NULL, unsubscribe_token = NULL,
             claimed_at = NULL, sent_at = now(), last_error_code = NULL
         WHERE id = $1 AND status = 'pending'`,
        [invitation.id],
      );
      sent += 1;
    } catch {
      await query(
        `UPDATE public.survey_invitations
         SET attempt_count = LEAST(attempt_count + 1, 3), status = 'failed',
             claimed_at = NULL, last_error_code = 'delivery_unknown'
         WHERE id = $1 AND status = 'pending'`,
        [invitation.id],
      );
      failed += 1;
      break;
    }
  }

  await query(
    `UPDATE public.survey_invitation_campaigns campaign
     SET status = CASE WHEN EXISTS (
       SELECT 1 FROM public.survey_invitations invitation
       WHERE invitation.campaign_id = campaign.id AND invitation.status IN ('pending', 'failed')
     ) THEN 'partial' ELSE 'sent' END
     WHERE campaign.status = 'scheduled' AND campaign.scheduled_at <= now()
       AND NOT EXISTS (
         SELECT 1 FROM public.survey_invitations invitation
         WHERE invitation.campaign_id = campaign.id AND invitation.status = 'pending'
       )`,
    [],
  );
  return { sent, failed, skipped: false };
}
