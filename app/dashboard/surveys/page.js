import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { summarizeSurveyScores } from "@/lib/survey-score";
import CreateSurveyForm from "./CreateSurveyForm";
import CopySurveyLinkButton from "./CopySurveyLinkButton";
import InvitationCampaignForm from "./InvitationCampaignForm";
import CancelInvitationCampaignButton from "./CancelInvitationCampaignButton";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Anketler", "Surveys")} — ReviewBridge` };
}

export default async function SurveysDashboard() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const surveys = await query(
    `SELECT s.id, s.title, s.survey_type, s.public_token, s.created_at,
            count(r.id)::int AS response_count,
            avg(r.score)::numeric(4,1) AS average_score,
            count(r.id) FILTER (WHERE r.score >= 9)::int AS promoters,
            count(r.id) FILTER (WHERE r.score <= 6)::int AS detractors,
            count(r.id) FILTER (WHERE r.score >= 4)::int AS satisfied
     FROM public.customer_surveys s
     LEFT JOIN public.customer_survey_responses r ON r.survey_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [user.id],
  );
  const comments = await query(
    `SELECT s.title, s.survey_type, r.score, r.comment, r.created_at
     FROM public.customer_survey_responses r
     JOIN public.customer_surveys s ON s.id = r.survey_id
     WHERE s.user_id = $1 AND r.comment IS NOT NULL
     ORDER BY r.created_at DESC LIMIT 100`,
    [user.id],
  );
  const campaigns = await query(
    `SELECT campaign.id, campaign.title, campaign.status, campaign.recipient_count,
            campaign.scheduled_at, campaign.created_at,
            count(invitation.id) FILTER (WHERE invitation.status = 'sent')::int AS sent_count,
            count(invitation.id) FILTER (WHERE invitation.status = 'failed')::int AS failed_count,
            count(invitation.id) FILTER (WHERE invitation.last_error_code = 'delivery_unknown')::int AS unknown_delivery_count,
            count(invitation.id) FILTER (WHERE invitation.status = 'unsubscribed')::int AS opted_out_count
     FROM public.survey_invitation_campaigns campaign
     LEFT JOIN public.survey_invitations invitation ON invitation.campaign_id = campaign.id
     WHERE campaign.user_id = $1
     GROUP BY campaign.id
     ORDER BY campaign.created_at DESC LIMIT 50`,
    [user.id],
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t(locale, "NPS ve CSAT anketleri", "NPS and CSAT surveys")}</h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "Ad ve e-posta almadan yanıt toplayın. NPS -100 ile +100 arasında hesaplanır; CSAT 4 veya 5 verenlerin yüzdesidir. Ek yorumlar yanıtı yazan kişiyi tanımlayabilecek bilgi içerebilir.", "Collect scores without names or email addresses. NPS ranges from -100 to +100; CSAT is the share of 4 or 5 ratings. Optional comments may contain information that identifies the respondent.")}</p>
      </header>
      <CreateSurveyForm />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Anketleriniz", "Your surveys")}</h2>
        {surveys.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz anket oluşturmadınız.", "You have not created a survey yet.")}</p>}
        {surveys.map((survey) => {
          const summary = summarizeSurveyScores(survey.survey_type, {
            responseCount: survey.response_count,
            promoters: survey.promoters,
            detractors: survey.detractors,
            satisfied: survey.satisfied,
            average: survey.average_score,
          });
          return (
            <article key={survey.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{survey.title}</h3>
                  <p className="text-xs text-muted">{survey.survey_type.toUpperCase()} · {survey.response_count} {t(locale, "yanıt", "responses")}</p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {summary.score === null ? "—" : survey.survey_type === "nps" ? `${summary.score}` : `${summary.score}%`}
                  <span className="ml-1 text-xs font-normal text-muted">{survey.survey_type === "nps" ? "NPS" : "CSAT"}</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-muted">{t(locale, "Ortalama puan", "Average score")}: {summary.average ?? "—"} / {survey.survey_type === "nps" ? 10 : 5}</p>
              <p className="mt-2 break-all text-xs text-muted">{`${baseUrl}/survey/${survey.public_token}`}</p>
              <CopySurveyLinkButton url={`${baseUrl}/survey/${survey.public_token}`} locale={locale} />
              {process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
                ? <InvitationCampaignForm surveyId={survey.id} surveyTitle={survey.title} />
                : <p className="mt-4 rounded-lg bg-muted-bg p-3 text-xs text-muted">{t(locale, "Anket daveti açılmadan önce Vercel'de Resend API anahtarı ve doğrulanmış gönderici ayarlanmalı.", "Set a Resend API key and verified sender in Vercel before enabling survey invitations.")}</p>}
            </article>
          );
        })}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Davet kampanyaları", "Invitation campaigns")}</h2>
        {campaigns.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz davet planlanmadı.", "No invitations have been scheduled yet.")}</p>}
        {campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border border-border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-foreground">{campaign.title}</strong><span className="text-xs text-muted">{campaign.status}</span></div><p className="mt-1 text-xs text-muted">{new Date(campaign.scheduled_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")} · {campaign.sent_count}/{campaign.recipient_count} {t(locale, "gönderildi", "sent")} · {campaign.failed_count} {t(locale, "başarısız", "failed")} · {campaign.opted_out_count} {t(locale, "vazgeçti", "opted out")}</p>{Number(campaign.unknown_delivery_count) > 0 && <p className="mt-2 text-xs text-amber-700">{t(locale, "Bazı teslimatlar doğrulanamadı; alıcılara ulaşmış olabilir. Aynı listeyi hemen tekrar göndermeyin.", "Some deliveries could not be confirmed and may have reached recipients. Do not immediately send the same list again.")}</p>}{campaign.status === "scheduled" && <CancelInvitationCampaignButton campaignId={campaign.id} locale={locale} />}</article>)}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Yazılı yanıtlar", "Written responses")}</h2>
        {comments.length === 0 && <p className="text-sm text-muted">{t(locale, "Henüz yazılı yanıt yok.", "No written responses yet.")}</p>}
        {comments.map((item, index) => (
          <article key={`${item.created_at}-${index}`} className="rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-foreground">{item.title} · {item.survey_type.toUpperCase()} {item.score}/ {item.survey_type === "nps" ? 10 : 5}</strong>
              <time className="text-xs text-muted">{new Date(item.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{item.comment}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
