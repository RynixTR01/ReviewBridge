"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import { isRateLimited } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{48}$/;

export async function createFeedbackSourceAction(_previousState, formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const name = String(formData.get("businessName") || "").trim();
  if (name.length < 2 || name.length > 100) return { error: t(locale, "İşletme adı 2–100 karakter olmalı.", "Business name must be 2–100 characters.") };

  const profile = await queryOne("SELECT plan FROM public.users WHERE id = $1", [user.id]);
  const plan = PLAN_LIMITS[profile?.plan] ? profile.plan : "free";
  const count = await queryOne("SELECT count(*)::int AS count FROM public.sources WHERE user_id = $1", [user.id]);
  if (count.count >= PLAN_LIMITS[plan].maxSources) return { error: t(locale, "Planınızın kaynak sınırına ulaştınız.", "You have reached your plan's source limit.") };

  const token = randomBytes(24).toString("hex");
  const widgetToken = randomUUID().replaceAll("-", "");
  let widget;
  try {
    widget = await queryOne(
      `WITH new_source AS (
         INSERT INTO public.sources
           (user_id, platform, place_id, business_name, sync_status, last_synced_at)
         VALUES ($1, 'first_party', $2, $3, 'done', now()) RETURNING id
       )
       INSERT INTO public.widgets
         (user_id, source_id, theme, max_reviews, show_badge, embed_token,
          user_plan, source_place_id, source_platform)
       SELECT $1, id, 'light', 5, true, $4, $5, $2, 'first_party'
      FROM new_source RETURNING id, source_id`,
      [user.id, token, name, widgetToken, plan],
    );
  } catch (error) {
    console.error("Feedback source creation failed:", error);
    return { error: t(locale, "Geri bildirim kaynağı oluşturulamadı.", "Could not create the feedback source.") };
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/feedback?source=${widget.source_id}`);
}

export async function submitFeedbackAction(_previousState, formData) {
  const locale = await getLocale();
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const rating = Number(formData.get("rating"));
  if (formData.get("website")) return { success: true };
  if (!TOKEN.test(token) || name.length < 1 || name.length > 80 || body.length < 10 || body.length > 2000 || !Number.isInteger(rating) || rating < 1 || rating > 5 || formData.get("consent") !== "on") {
    return { error: t(locale, "Lütfen ad, puan, en az 10 karakterlik yorum ve yayın iznini doldurun.", "Enter your name, a rating, a review of at least 10 characters, and consent to publish.") };
  }
  const requestHeaders = await headers();
  if (isRateLimited({ headers: requestHeaders }, `feedback:${token}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return { error: t(locale, "Çok fazla gönderim yapıldı. Daha sonra tekrar deneyin.", "Too many submissions. Please try again later.") };
  }
  const source = await queryOne(
    "SELECT id FROM public.sources WHERE platform = 'first_party' AND place_id = $1",
    [token],
  );
  if (!source) return { error: t(locale, "Bu geri bildirim bağlantısı bulunamadı.", "This feedback link could not be found.") };
  const submitted = await queryOne(
    `WITH quota AS (
       INSERT INTO public.feedback_daily_limits (source_id, quota_day, submission_count)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (source_id, quota_day) DO UPDATE
       SET submission_count = public.feedback_daily_limits.submission_count + 1
       WHERE public.feedback_daily_limits.submission_count < 100
       RETURNING source_id
     )
     INSERT INTO public.feedback_submissions
       (source_id, reviewer_name, rating, body, consented_at)
     SELECT $1, $2, $3, $4, now() FROM quota
     RETURNING id`,
    [source.id, name, rating, body],
  );
  if (!submitted) return { error: t(locale, "Bugün için gönderim sınırına ulaşıldı.", "The submission limit for today has been reached.") };
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
