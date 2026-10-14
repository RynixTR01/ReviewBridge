"use client";

import { useActionState } from "react";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function FeedbackForm({ token }) {
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitFeedbackAction, null);
  if (state?.success) return <p role="status" className="rounded-xl bg-green-50 p-5 text-green-800">{t(locale, "Teşekkürler! Yanıtınız işletmeye iletildi. Yayınlanmadan önce incelenecek.", "Thank you! Your feedback was sent to the business and will be reviewed before publication.")}</p>;
  return <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-8">
    <input type="hidden" name="token" value={token} />
    <div className="hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <div><label htmlFor="name" className="mb-1 block text-sm font-medium">{t(locale, "Adınız", "Your name")}</label><input id="name" name="name" required maxLength={80} className="w-full rounded-xl border border-border px-3 py-2" /></div>
    <div><label htmlFor="rating" className="mb-1 block text-sm font-medium">{t(locale, "Puanınız", "Your rating")}</label><select id="rating" name="rating" required defaultValue="" className="w-full rounded-xl border border-border px-3 py-2"><option value="" disabled>{t(locale, "Puan seçin", "Choose a rating")}</option>{[5,4,3,2,1].map((n)=><option key={n} value={n}>{n} / 5</option>)}</select></div>
    <div><label htmlFor="body" className="mb-1 block text-sm font-medium">{t(locale, "Deneyiminiz", "Your experience")}</label><textarea id="body" name="body" required minLength={10} maxLength={2000} rows={5} className="w-full rounded-xl border border-border px-3 py-2" /></div>
    <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="consent" required className="mt-1" /><span>{t(locale, "Adımın, puanımın ve yorumumun bu işletmenin web sitesinde yayınlanmasına izin veriyorum.", "I allow this business to publish my name, rating, and feedback on its website.")} <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t(locale, "Gizlilik bilgisi", "Privacy information")}</a></span></label>
    {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <button disabled={pending} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50">{pending ? t(locale, "Gönderiliyor…", "Sending…") : t(locale, "Geri bildirimi gönder", "Send feedback")}</button>
  </form>;
}
