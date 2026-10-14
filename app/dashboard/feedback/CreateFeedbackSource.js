"use client";

import { useActionState } from "react";
import { createFeedbackSourceAction } from "@/app/actions/feedback";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function CreateFeedbackSource() {
  const locale = useLocale();
  const [state, action, pending] = useActionState(createFeedbackSourceAction, null);
  return (
    <form action={action} className="rounded-2xl border border-border bg-white p-5 sm:p-6 space-y-3">
      <h2 className="font-semibold text-foreground">{t(locale, "Geri bildirim bağlantısı oluştur", "Create a feedback link")}</h2>
      <p className="text-sm text-muted">{t(locale, "Müşterilerinizden doğrudan yorum isteyin. Gönderimler siz onaylayana kadar widget'ta görünmez.", "Ask customers directly for feedback. Submissions stay private until you approve them.")}</p>
      <label htmlFor="businessName" className="block text-sm font-medium text-foreground">{t(locale, "İşletme veya marka adı", "Business or brand name")}</label>
      <input id="businessName" name="businessName" required minLength={2} maxLength={100} className="w-full rounded-xl border border-border px-3 py-2 text-foreground" />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? t(locale, "Oluşturuluyor…", "Creating…") : t(locale, "Bağlantı oluştur", "Create link")}</button>
    </form>
  );
}
