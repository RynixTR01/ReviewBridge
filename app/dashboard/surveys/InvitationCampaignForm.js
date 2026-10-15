"use client";

import { useActionState } from "react";
import { createSurveyInvitationCampaignAction } from "@/app/actions/surveys";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export default function InvitationCampaignForm({ surveyId, surveyTitle }) {
  const locale = useLocale();
  const [state, action, pending] = useActionState(createSurveyInvitationCampaignAction, null);
  return <form action={action} className="mt-4 space-y-3 rounded-xl border border-border bg-muted-bg p-4">
    <input type="hidden" name="surveyId" value={surveyId} />
    <h4 className="text-sm font-semibold text-foreground">{t(locale, "Bu anket için davet planla", "Schedule invitations for this survey")}</h4>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-muted">{t(locale, "Kampanya adı", "Campaign name")}<input name="title" required minLength={2} maxLength={100} defaultValue={`${surveyTitle} · ${locale === "tr" ? "davet" : "invitation"}`} className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground" /></label>
      <label className="text-xs text-muted">{t(locale, "Gönderim günü", "Send date")}<input type="date" name="scheduledDate" required className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground" /></label>
    </div>
    <label className="block text-xs text-muted">{t(locale, "E-posta adresleri (satır, virgül veya noktalı virgülle ayırın; en fazla 100)", "Email addresses (separate with lines, commas, or semicolons; up to 100)")}<textarea name="recipients" required rows={4} placeholder="name@example.com" className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground" /></label>
    <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" name="recipientConsent" required className="mt-0.5" /><span>{t(locale, "Bu kişilerin müşteri geri bildirim anketi daveti almayı kabul ettiğini doğruluyorum. Davet tüm alıcılara aynı özel anketi gönderir; puana göre yönlendirme yapmaz ve yanıtı herkese açık bir yorum sitesinde yayınlamaz.", "I confirm these people agreed to receive a customer feedback survey invitation. Every recipient gets the same private survey; it does not route people by rating or publish answers on a public review platform.")}</span></label>
    <p className="text-xs text-muted">{t(locale, "E-posta, Vercel'deki Resend API anahtarı ve doğrulanmış gönderici adresi ayarlandıktan sonra gönderilir. Mevcut zamanlayıcı günlük çalışır; seçilen günden sonra teslimat 24 saate kadar gecikebilir. Her davette vazgeçme bağlantısı bulunur.", "Email is sent after a Resend API key and verified sender address are configured in Vercel. The current scheduler runs daily, so delivery can be delayed up to 24 hours after the selected date. Every invitation includes an opt-out link.")}</p>
    {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-success">{t(locale, "Davet kampanyası sıraya alındı.", "Invitation campaign scheduled.")} · {state.recipientCount}</p>}
    <button disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? t(locale, "Kaydediliyor…", "Saving…") : t(locale, "Davetleri planla", "Schedule invitations")}</button>
  </form>;
}
