import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import SurveyForm from "./SurveyForm";

export default async function PublicSurveyPage({ params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token || "")) notFound();
  const survey = await queryOne("SELECT title, survey_type FROM public.customer_surveys WHERE public_token = $1", [token]);
  if (!survey || !["nps", "csat"].includes(survey.survey_type)) notFound();
  const locale = await getLocale();
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{survey.title}</h1>
      <p className="mb-6 text-sm text-muted">{t(locale, "Kısa anket yanıtınız işletmeye hizmetini geliştirmesi için yardımcı olur.", "Your brief survey response helps this business improve its service.")}</p>
      <SurveyForm token={token} type={survey.survey_type} />
    </main>
  );
}
