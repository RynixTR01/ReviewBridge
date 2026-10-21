"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getNeonClient, query, queryOne } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { createFeedbackNotification, createSourceLimitNotification } from "@/lib/notifications";
import { isHoneypotFilled } from "@/lib/public-form-protection";
import { checkBotId } from "botid/server";
import { createSourceWithinPlanLimit } from "@/lib/source-plan-guard";
import { submitFirstPartyFeedbackWithinPlan } from "@/lib/feedback-submission";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{48}$/;

export async function createFeedbackSourceAction(_previousState, formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const name = String(formData.get("businessName") || "").trim();
  if (name.length < 2 || name.length > 100) return { error: t(locale, "İşletme adı 2–100 karakter olmalı.", "Business name must be 2–100 characters.") };

  const token = randomBytes(24).toString("hex");
  const widgetToken = randomUUID().replaceAll("-", "");
  let admission;
  try {
    admission = await createSourceWithinPlanLimit(getNeonClient(), {
      userId: user.id,
      platform: "first_party",
      placeId: token,
      businessName: name,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: "done",
      widget: { embedToken: widgetToken },
    });
  } catch (error) {
    console.error("Feedback source creation failed.", { code: error?.code });
    return { error: t(locale, "Geri bildirim kaynağı oluşturulamadı.", "Could not create the feedback source.") };
  }
  if (admission.status === "limit") {
    await createSourceLimitNotification({ userId: user.id, count: admission.count, limit: admission.limit });
    return { error: t(locale, "Planınızın kaynak sınırına ulaştınız.", "You have reached your plan's source limit.") };
  }
  if (admission.status !== "created" || !admission.source || !admission.widgetId) {
    return { error: t(locale, "Geri bildirim kaynağı oluşturulamadı.", "Could not create the feedback source.") };
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/feedback?source=${admission.source.id}`);
}

export async function submitFeedbackAction(_previousState, formData) {
  const locale = await getLocale();
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const rating = Number(formData.get("rating"));
  if (isHoneypotFilled(formData)) return { success: true };
  const botCheck = await checkBotId({ advancedOptions: { checkLevel: "basic" } });
  if (botCheck.isBot) {
    return { error: t(locale, "Gönderim otomatik olarak algılandı. Lütfen tarayıcıdan tekrar deneyin.", "This submission was flagged as automated. Please try again from your browser.") };
  }
  if (!TOKEN.test(token) || name.length < 1 || name.length > 80 || body.length < 10 || body.length > 2000 || !Number.isInteger(rating) || rating < 1 || rating > 5 || formData.get("consent") !== "on") {
    return { error: t(locale, "Lütfen ad, puan, en az 10 karakterlik yorum ve yayın iznini doldurun.", "Enter your name, a rating, a review of at least 10 characters, and consent to publish.") };
  }
  const requestHeaders = await headers();
  if (await isRateLimited({ headers: requestHeaders }, `feedback:${token}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return { error: t(locale, "Çok fazla gönderim yapıldı. Daha sonra tekrar deneyin.", "Too many submissions. Please try again later.") };
  }
  let submission;
  try {
    submission = await submitFirstPartyFeedbackWithinPlan(getNeonClient(), { token, name, rating, body });
  } catch (error) {
    console.error("Public feedback submission failed.", { code: error?.code });
    return { error: t(locale, "Gönderim tamamlanamadı. Daha sonra tekrar deneyin.", "The submission could not be completed. Please try again later.") };
  }
  if (!submission) return { error: t(locale, "Bu geri bildirim bağlantısı bulunamadı.", "This feedback link could not be found.") };
  if (!submission.active) {
    return { error: t(locale, "Bu geri bildirim bağlantısı mevcut plan sınırı nedeniyle geçici olarak kapalı.", "This feedback link is paused because it exceeds the current plan limit.") };
  }
  if (!submission.submission_id) return { error: t(locale, "Bugün için gönderim sınırına ulaşıldı.", "The submission limit for today has been reached.") };
  await createFeedbackNotification({
    userId: submission.user_id,
    sourceId: submission.source_id,
    sourceName: submission.business_name,
    submissionId: submission.submission_id,
  });
  return { success: true };
}

export async function moderateFeedbackAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  if (!UUID.test(id) || !["approve", "reject", "remove"].includes(decision)) return;

  if (decision === "approve") {
    await queryOne(
      `WITH candidate AS (
         SELECT f.* FROM public.feedback_submissions f
         JOIN public.sources s ON s.id = f.source_id
         WHERE f.id = $1 AND s.user_id = $2 AND s.platform = 'first_party' AND f.status = 'pending'
       ), published AS (
         INSERT INTO public.reviews
           (id, source_id, external_review_id, reviewer_name, rating, body, reviewed_at)
         SELECT id, source_id, 'feedback:' || id::text, reviewer_name, rating, body, created_at
         FROM candidate RETURNING id
       )
       UPDATE public.feedback_submissions SET status = 'approved', moderated_at = now()
       WHERE id IN (SELECT id FROM published) RETURNING id`,
      [id, user.id],
    );
  } else if (decision === "reject") {
    await query(
      `UPDATE public.feedback_submissions f SET status = 'rejected', moderated_at = now()
       FROM public.sources s
       WHERE f.id = $1 AND f.source_id = s.id AND s.user_id = $2
         AND s.platform = 'first_party' AND f.status = 'pending'`,
      [id, user.id],
    );
  } else {
    await query(
      `WITH removed AS (
         DELETE FROM public.reviews r USING public.feedback_submissions f, public.sources s
         WHERE r.id = f.id AND f.id = $1 AND f.source_id = s.id
           AND s.user_id = $2 AND s.platform = 'first_party' AND f.status = 'approved'
         RETURNING r.id
       )
       UPDATE public.feedback_submissions SET status = 'rejected', moderated_at = now()
       WHERE id IN (SELECT id FROM removed)`,
      [id, user.id],
    );
  }
  revalidatePath("/dashboard/feedback");
  revalidatePath("/dashboard");
}
