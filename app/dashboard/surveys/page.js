import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { summarizeSurveyScores } from "@/lib/survey-score";
import CreateSurveyForm from "./CreateSurveyForm";
import CopySurveyLinkButton from "./CopySurveyLinkButton";

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
            </article>
          );
        })}
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
