"use client";

import { useActionState } from "react";
import { inviteBrandMemberAction } from "@/app/actions/brands";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function AddMember({ brandId }) {
  const locale = useLocale();
  const [state, action, pending] = useActionState(inviteBrandMemberAction, null);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
    <input type="hidden" name="brandId" value={brandId} />
    <label className="text-xs text-muted">{t(locale, "Müşterinin e-postası", "Client email")}<input name="email" type="email" required className="mt-1 block w-56 rounded-lg border border-border px-2 py-1.5 text-sm" /></label>
    <label className="text-xs text-muted">{t(locale, "Rol", "Role")}<select name="role" defaultValue="client" className="mt-1 block rounded-lg border border-border px-2 py-1.5 text-sm"><option value="client">{t(locale, "Müşteri · salt okunur", "Client · read only")}</option><option value="viewer">{t(locale, "Görüntüleyici", "Viewer")}</option><option value="editor">{t(locale, "Düzenleyici", "Editor")}</option></select></label>
    <button disabled={pending} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white disabled:opacity-50">{t(locale, "Davet bağlantısı oluştur", "Create invite link")}</button>
    {state?.inviteUrl && <div className="basis-full rounded-lg bg-muted-bg p-3"><p className="text-xs text-muted">{t(locale, "Bağlantı 7 gün geçerlidir. Müşteriye güvenli biçimde iletin; bağlantı bu hesapta yalnızca bir kez kabul edilebilir.", "This link is valid for 7 days. Share it securely with the client; it can only be accepted once for this account.")}</p><input readOnly value={state.inviteUrl} aria-label={t(locale, "Davet bağlantısı", "Invitation link")} className="mt-2 w-full rounded border border-border bg-white px-2 py-1.5 text-xs" onFocus={(event) => event.currentTarget.select()} /></div>}
    {state?.error && <p role="alert" className="basis-full text-xs text-danger">{state.error}</p>}
    {state?.success && <p role="status" className="basis-full text-xs text-success">{t(locale, "Davet bağlantısı hazır.", "Invitation link created.")}</p>}
  </form>;
}
