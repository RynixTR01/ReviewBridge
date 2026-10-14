"use server";

import { randomBytes } from "node:crypto";
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

