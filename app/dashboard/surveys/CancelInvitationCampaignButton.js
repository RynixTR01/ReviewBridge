"use client";

import { useActionState } from "react";
import { cancelSurveyInvitationCampaignAction } from "@/app/actions/surveys";
import { t } from "@/lib/i18n";

export default function CancelInvitationCampaignButton({ campaignId, locale }) {
  const [state, action, pending] = useActionState(cancelSurveyInvitationCampaignAction, null);
  return <form action={action} className="mt-2">
    <input type="hidden" name="campaignId" value={campaignId} />
    <button disabled={pending} className="text-xs text-danger underline disabled:opacity-50">{pending ? t(locale, "İptal ediliyor…", "Cancelling…") : t(locale, "Gönderilmemiş davetleri iptal et", "Cancel unsent invitations")}</button>
    {state?.error && <p role="alert" className="mt-1 text-xs text-danger">{state.error}</p>}
  </form>;
}
