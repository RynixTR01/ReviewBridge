"use client";

import { useActionState } from "react";
import { submitSurveyAction } from "@/app/actions/surveys";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function SurveyForm({ token, type }) {
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitSurveyAction, null);
  if (state?.success) return <p role="status" className="rounded-xl bg-green-50 p-5 text-green-800">{t(locale, "Yanıtınız için teşekkürler.", "Thank you for your response.")}</p>;
  const scores = type === "nps" ? Array.from({ length: 11 }, (_, index) => index) : [1, 2, 3, 4, 5];
  const question = type === "nps"
    ? t(locale, "Bu işletmeyi bir arkadaşınıza tavsiye etme olasılığınız nedir?", "How likely are you to recommend this business to a friend?")
    : t(locale, "Bu işletmeden ne kadar memnunsunuz?", "How satisfied are you with this business?");
  return (
    <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-8">
      <input type="hidden" name="token" value={token} />
      <div className="hidden" aria-hidden="true"><label htmlFor="surveyWebsite">Website</label><input id="surveyWebsite" name="website" tabIndex={-1} autoComplete="off" /></div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-foreground">{question}</legend>
        <div className="flex flex-wrap gap-2">
          {scores.map((score) => (
            <label key={score} className="flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-border px-3 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white">
              <input className="sr-only" type="radio" name="score" value={score} required aria-label={`${score}`} />
              <span>{score}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{type === "nps" ? t(locale, "Hiç olası değil", "Not at all likely") : t(locale, "Memnun değilim", "Not satisfied")}</span>
          <span>{type === "nps" ? t(locale, "Çok olası", "Extremely likely") : t(locale, "Çok memnunum", "Very satisfied")}</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="surveyComment" className="mb-1 block text-sm font-medium text-foreground">{t(locale, "Eklemek istediğiniz bir şey var mı? (isteğe bağlı)", "Anything else to add? (optional)")}</label>
        <textarea id="surveyComment" name="comment" maxLength={2000} rows={4} className="w-full rounded-xl border border-border px-3 py-2 text-foreground" />
      </div>
      <p className="text-xs text-muted">{t(locale, "Yanıtlar işletmenin özel anket sonuçlarında kullanılır; ad veya e-posta istenmez, herkese açık yayınlanmaz. İsteğe bağlı yorumlara kişisel bilgi yazmayın.", "Responses are used in the business's private survey results; no name or email is requested, and responses are not published publicly. Do not include personal details in optional comments.")}</p>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50">
        {pending ? t(locale, "Gönderiliyor…", "Sending…") : t(locale, "Yanıtı gönder", "Submit response")}
      </button>
    </form>
  );
}
