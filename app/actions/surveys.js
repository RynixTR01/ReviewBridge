"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { createSurveyResponseNotification } from "@/lib/notifications";
import { isHoneypotFilled } from "@/lib/public-form-protection";
import { checkBotId } from "botid/server";
import { recipientFingerprint } from "@/lib/privacy-fingerprint";

const TOKEN = /^[a-f0-9]{48}$/;

export async function createSurveyAction(_previousState, formData) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Lütfen yeniden giriş yapın.", "Please sign in again.") };
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("surveyType") || "");
  if (title.length < 2 || title.length > 100 || !["nps", "csat"].includes(type)) {
    return { error: t(locale, "Anket adı ve türünü kontrol edin.", "Check the survey name and type.") };
  }

  try {
    await queryOne(
      "INSERT INTO public.customer_surveys (user_id, title, survey_type, public_token) VALUES ($1, $2, $3, $4) RETURNING id",
      [user.id, title, type, randomBytes(24).toString("hex")],
    );
  } catch {
    return { error: t(locale, "Anket oluşturulamadı. Daha sonra tekrar deneyin.", "Could not create the survey. Try again later.") };
  }
  revalidatePath("/dashboard/surveys");
  return { success: true };
}

export async function createSurveyInvitationCampaignAction(_previousState, formData) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Lütfen yeniden giriş yapın.", "Please sign in again.") };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { error: t(locale, "Davet göndermek için Vercel'de Resend anahtarı ve doğrulanmış gönderici ayarlanmalı.", "Set a Resend API key and verified sender in Vercel before scheduling invitations.") };
  }

  const surveyId = String(formData.get("surveyId") || "");
  const title = String(formData.get("title") || "").trim();
  const dateValue = String(formData.get("scheduledDate") || "");
  const consent = formData.get("recipientConsent") === "on";
  const recipientsRaw = String(formData.get("recipients") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(surveyId)
      || title.length < 2 || title.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !consent) {
    return { error: t(locale, "Anketi, kampanya adını, tarihi ve izin onayını kontrol edin.", "Check the survey, campaign name, date, and consent confirmation.") };
  }
  if (recipientsRaw.length > 26_000) {
    return { error: t(locale, "E-posta listesi çok uzun.", "The email list is too long.") };
  }

  const scheduledAt = new Date(`${dateValue}T00:00:00.000Z`);
  const now = Date.now();
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.toISOString().slice(0, 10) !== dateValue || scheduledAt.getTime() < now - 24 * 60 * 60 * 1000 || scheduledAt.getTime() > now + 30 * 24 * 60 * 60 * 1000) {
    return { error: t(locale, "Gönderim tarihi bugünden en fazla 30 gün sonrası olabilir.", "Choose a date from today through the next 30 days.") };
  }

  const recipients = [...new Set(recipientsRaw.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length || recipients.length > 100 || recipients.some((email) => email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: t(locale, "1–100 arasında geçerli ve benzersiz e-posta adresi girin.", "Enter 1–100 valid, unique email addresses.") };
  }

  if (await isRateLimited({ headers: await headers() }, `survey-campaign:${user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return { error: t(locale, "Bir saatte en fazla 5 kampanya oluşturabilirsiniz. Lütfen daha sonra deneyin.", "You can create up to 5 campaigns per hour. Please try again later.") };
  }

  const survey = await queryOne("SELECT id FROM public.customer_surveys WHERE id = $1 AND user_id = $2", [surveyId, user.id]);
  if (!survey) return { error: t(locale, "Anket bulunamadı.", "Survey not found.") };

  const campaignId = randomUUID();
  const rows = recipients.map((email) => {
    const unsubscribeToken = randomBytes(24).toString("hex");
    return {
      email,
      email_fingerprint: recipientFingerprint(user.id, email),
      unsubscribe_token: unsubscribeToken,
      unsubscribe_token_hash: createHash("sha256").update(unsubscribeToken).digest("hex"),
    };
  });
  let created;
  try {
    created = await queryOne(
      `WITH recipients AS (
         SELECT DISTINCT ON (email_fingerprint) email, email_fingerprint, unsubscribe_token, unsubscribe_token_hash
         FROM jsonb_to_recordset($7::jsonb) AS recipient(
           email text, email_fingerprint text, unsubscribe_token text, unsubscribe_token_hash text
         )
         ORDER BY email_fingerprint
       ), eligible AS (
         SELECT recipient.* FROM recipients recipient
         WHERE NOT EXISTS (
           SELECT 1 FROM public.survey_invitation_suppressions suppression
           WHERE suppression.user_id = $2 AND suppression.recipient_fingerprint = recipient.email_fingerprint
         )
       ), campaign AS (
         INSERT INTO public.survey_invitation_campaigns
           (id, user_id, survey_id, title, locale, scheduled_at, consent_confirmed_at, recipient_count)
         SELECT $1, $2, $3, $4, $5, $6, now(), count(*)::int
         FROM eligible
         WHERE EXISTS (SELECT 1 FROM public.customer_surveys WHERE id = $3 AND user_id = $2)
         HAVING count(*) > 0
         RETURNING id
       ), inserted AS (
         INSERT INTO public.survey_invitations
           (campaign_id, user_id, recipient_email, recipient_fingerprint, unsubscribe_token, unsubscribe_token_hash)
         SELECT campaign.id, $2, recipient.email, recipient.email_fingerprint, recipient.unsubscribe_token, recipient.unsubscribe_token_hash
         FROM campaign CROSS JOIN eligible recipient
         RETURNING id
       )
       SELECT campaign.id, (SELECT count(*)::int FROM inserted) AS recipient_count FROM campaign`,
      [campaignId, user.id, surveyId, title, locale, scheduledAt.toISOString(), JSON.stringify(rows)],
    );
    if (!created) {
      return { error: t(locale, "Bu listedeki adresler daha önce davet almayı durdurmuş. Gönderim oluşturulmadı.", "Everyone on this list previously opted out. No campaign was created.") };
    }
  } catch (error) {
    console.error("Survey invitation campaign could not be created.", { name: error?.name });
    return { error: t(locale, "Davet kampanyası oluşturulamadı. Daha sonra tekrar deneyin.", "Could not create the invitation campaign. Try again later.") };
  }
  revalidatePath("/dashboard/surveys");
  return { success: true, recipientCount: Number(created.recipient_count) || 0 };
}

export async function cancelSurveyInvitationCampaignAction(_previousState, formData) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Lütfen yeniden giriş yapın.", "Please sign in again.") };
  const campaignId = String(formData.get("campaignId") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(campaignId)) return { error: t(locale, "Kampanya bulunamadı.", "Campaign not found.") };
  try {
    const cancelled = await queryOne(
    `WITH cancelled_campaign AS (
       UPDATE public.survey_invitation_campaigns
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'scheduled'
         AND NOT EXISTS (SELECT 1 FROM public.survey_invitations WHERE campaign_id = $1 AND claimed_at IS NOT NULL)
       RETURNING id
     ), cancelled_invitations AS (
       UPDATE public.survey_invitations
       SET status = 'cancelled', recipient_email = NULL, unsubscribe_token = NULL,
           claimed_at = NULL, last_error_code = 'cancelled'
       WHERE campaign_id IN (SELECT id FROM cancelled_campaign) AND status = 'pending' AND claimed_at IS NULL
       RETURNING id
     )
     SELECT id FROM cancelled_campaign`,
    [campaignId, user.id],
    );
    if (!cancelled) return { error: t(locale, "Kampanya bulunamadı, zaten işlendi veya bir davet gönderiliyor.", "Campaign not found, already processed, or an invitation is currently being sent.") };
  } catch {
    return { error: t(locale, "Kampanya durdurulamadı. Lütfen tekrar deneyin.", "Could not cancel the campaign. Please try again.") };
  }
  revalidatePath("/dashboard/surveys");
  return { success: true };
}

export async function submitSurveyAction(_previousState, formData) {
  const locale = await getLocale();
  if (isHoneypotFilled(formData)) return { success: true };
  const botCheck = await checkBotId({ advancedOptions: { checkLevel: "basic" } });
  if (botCheck.isBot) {
    return { error: t(locale, "Gönderim otomatik olarak algılandı. Lütfen tarayıcıdan tekrar deneyin.", "This submission was flagged as automated. Please try again from your browser.") };
  }
  const token = String(formData.get("token") || "");
  const scoreValue = formData.get("score");
  const score = Number(scoreValue);
  const commentValue = formData.get("comment");
  const comment = typeof commentValue === "string" ? commentValue.trim() : "";
  if (!TOKEN.test(token) || typeof scoreValue !== "string" || !/^(?:0|[1-9]|10)$/.test(scoreValue) || !Number.isInteger(score) || comment.length > 2000) {
    return { error: t(locale, "Yanıt bilgilerini kontrol edin.", "Check your response.") };
  }

  const requestHeaders = await headers();
  if (await isRateLimited({ headers: requestHeaders }, `survey:${token}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return { error: t(locale, "Çok fazla gönderim yapıldı. Daha sonra tekrar deneyin.", "Too many submissions. Please try again later.") };
  }

  const survey = await queryOne("SELECT id, user_id, title, survey_type FROM public.customer_surveys WHERE public_token = $1", [token]);
  if (!survey) return { error: t(locale, "Bu anket bağlantısı bulunamadı.", "This survey link could not be found.") };
  const validScore = survey.survey_type === "nps" ? score >= 0 && score <= 10 : score >= 1 && score <= 5;
  if (!validScore) return { error: t(locale, "Puan seçin.", "Choose a score.") };

  const submitted = await queryOne(
    `WITH quota AS (
       INSERT INTO public.customer_survey_daily_limits (survey_id, response_day, response_count)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (survey_id, response_day) DO UPDATE
       SET response_count = public.customer_survey_daily_limits.response_count + 1
       WHERE public.customer_survey_daily_limits.response_count < 1000
       RETURNING survey_id
     )
     INSERT INTO public.customer_survey_responses (survey_id, score, comment)
     SELECT $1, $2, NULLIF($3, '') FROM quota
     RETURNING id`,
    [survey.id, score, comment],
  );
  if (!submitted) return { error: t(locale, "Bu anket bugün yanıt sınırına ulaştı.", "This survey has reached today's response limit.") };
  await createSurveyResponseNotification({
    userId: survey.user_id,
    surveyTitle: survey.title,
    surveyType: survey.survey_type,
    responseId: submitted.id,
    score,
  });
  return { success: true };
}

