"use client";

import { useActionState } from "react";
import { createSurveyAction } from "@/app/actions/surveys";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function CreateSurveyForm() {
  const locale = useLocale();
  const [state, action, pending] = useActionState(createSurveyAction, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-foreground">{t(locale, "Anket oluştur", "Create a survey")}</h2>
      <label htmlFor="surveyTitle" className="block text-sm font-medium text-foreground">{t(locale, "Anket adı", "Survey name")}</label>
      <input id="surveyTitle" name="title" required minLength={2} maxLength={100} className="w-full rounded-xl border border-border px-3 py-2 text-foreground" />
      <label htmlFor="surveyType" className="block text-sm font-medium text-foreground">{t(locale, "Ölçüm türü", "Survey type")}</label>
      <select id="surveyType" name="surveyType" defaultValue="nps" className="w-full rounded-xl border border-border px-3 py-2 text-foreground">
        <option value="nps">NPS — {t(locale, "tavsiye etme olasılığı", "likelihood to recommend")}</option>
        <option value="csat">CSAT — {t(locale, "memnuniyet", "customer satisfaction")}</option>
      </select>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-green-700">{t(locale, "Anket oluşturuldu.", "Survey created.")}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? t(locale, "Oluşturuluyor…", "Creating…") : t(locale, "Anket bağlantısı oluştur", "Create survey link")}
      </button>
    </form>
  );
}
