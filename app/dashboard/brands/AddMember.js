"use client";

import { useActionState } from "react";
import { addBrandMemberAction } from "@/app/actions/brands";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function AddMember({ brandId }) {
  const locale = useLocale();
  const [state, action, pending] = useActionState(addBrandMemberAction, null);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
    <input type="hidden" name="brandId" value={brandId} />
    <label className="text-xs text-muted">{t(locale, "Kayıtlı üye e-postası", "Registered member email")}<input name="email" type="email" required className="mt-1 block w-56 rounded-lg border border-border px-2 py-1.5 text-sm" /></label>
    <label className="text-xs text-muted">{t(locale, "Rol", "Role")}<select name="role" className="mt-1 block rounded-lg border border-border px-2 py-1.5 text-sm"><option value="viewer">{t(locale, "Görüntüleyici", "Viewer")}</option><option value="editor">{t(locale, "Düzenleyici", "Editor")}</option></select></label>
    <button disabled={pending} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50">{t(locale, "Üye ekle", "Add member")}</button>
    {state?.error && <p role="alert" className="basis-full text-xs text-danger">{state.error}</p>}
    {state?.success && <p role="status" className="basis-full text-xs text-success">{t(locale, "Üye eklendi.", "Member added.")}</p>}
  </form>;
}
