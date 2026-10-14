"use client";

import { useActionState } from "react";
import { createBrandAction } from "@/app/actions/brands";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function CreateBrand() {
  const locale = useLocale();
  const [state, action, pending] = useActionState(createBrandAction, null);
  return <form action={action} className="space-y-3 rounded-2xl border border-border bg-white p-5">
    <h2 className="font-semibold text-foreground">{t(locale, "Yeni marka veya müşteri", "New brand or client")}</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-foreground">{t(locale, "Ad", "Name")}<input name="name" required minLength={2} maxLength={100} className="mt-1 w-full rounded-xl border border-border px-3 py-2" /></label>
      <label className="text-sm text-foreground">{t(locale, "Site alan adı (isteğe bağlı)", "Website domain (optional)")}<input name="domain" maxLength={255} placeholder="example.com" className="mt-1 w-full rounded-xl border border-border px-3 py-2" /></label>
    </div>
    {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-success">{t(locale, "Marka oluşturuldu.", "Brand created.")}</p>}
    <button disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t(locale, "Oluştur", "Create")}</button>
  </form>;
}
