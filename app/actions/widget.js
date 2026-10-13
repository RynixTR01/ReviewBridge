"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { normalizeWidgetSettings, PLAN_LIMITS } from "@/lib/plans";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

export async function createWidgetForSourceAction(formData) {
  const sourceId = formData.get("sourceId");
  const user = await getCurrentUser();
  if (!user || !sourceId) redirect("/login");
  const profile = await queryOne("SELECT plan FROM public.users WHERE id = $1", [user.id]);
  const source = await queryOne(
    `SELECT s.id, s.place_id, s.platform,
            (SELECT source_maps_url FROM public.widgets WHERE source_id = s.id ORDER BY created_at LIMIT 1) AS source_maps_url
     FROM public.sources s WHERE s.id = $1 AND s.user_id = $2`,
    [sourceId, user.id],
  );
  if (!source) redirect("/dashboard");

  const plan = profile?.plan || "free";
  const widget = await queryOne(
    `INSERT INTO public.widgets
       (user_id, source_id, theme, max_reviews, show_badge, embed_token,
        user_plan, source_place_id, source_platform, source_maps_url)
     VALUES ($1, $2, 'light', 5, true, $3, $4, $5, $6, $7)
     RETURNING id`,
    [user.id, source.id, randomUUID().replace(/-/g, ""), plan, source.place_id, source.platform, source.source_maps_url],
  );
  if (!widget) redirect("/dashboard");
  revalidatePath("/dashboard");
  redirect(`/dashboard/widget/${widget.id}`);
}

export async function updateWidgetAction(formData) {
  const widgetId = formData.get("widgetId");
  const theme = formData.get("theme");
  const requestedMaxReviews = formData.get("maxReviews");
  const requestedShowBadge = formData.get("showBadge") === "true" || formData.get("showBadge") === true;
  const rawSmartFilter = formData.get("smartFilter");
  const requestedSmartFilter = rawSmartFilter === "on" || rawSmartFilter === "true" || rawSmartFilter === true;
  const showReviewButton = formData.get("showReviewButton") === "true" || formData.get("showReviewButton") === "on";
  const getBoolean = (key) => formData.get(key) === "true" || formData.get(key) === "on";

  if (!widgetId) {
    return { error: "Widget ID is required" };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await queryOne(
    "SELECT plan FROM public.users WHERE id = $1",
    [user.id]
  );
  const userPlan = profile?.plan || "free";

  const settings = normalizeWidgetSettings({
    theme,
    maxReviews: requestedMaxReviews,
    showBadge: requestedShowBadge,
    smartFilter: requestedSmartFilter,
    showReviewButton,
    layout: formData.get("layout"),
    showRatingSummary: formData.get("showRatingSummary") === "true",
    fontFamily: formData.get("fontFamily"),
    cardDensity: formData.get("cardDensity"),
    cornerStyle: formData.get("cornerStyle"),
    minimumRating: formData.get("minimumRating"),
    sortOrder: formData.get("sortOrder"),
    includeKeywords: formData.get("includeKeywords"),
    excludeKeywords: formData.get("excludeKeywords"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
    widgetLocale: formData.get("widgetLocale"),
    widgetTitle: formData.get("widgetTitle"),
    backgroundColor: formData.get("backgroundColor"),
    textColor: formData.get("textColor"),
    accentColor: formData.get("accentColor"),
    showReviewerAvatar: getBoolean("showReviewerAvatar"),
    showReviewedDate: getBoolean("showReviewedDate"),
    allowedDomains: formData.get("allowedDomains"),
  }, userPlan);

  // Update widget settings
  try {
    await query(
      `UPDATE public.widgets
       SET theme = $1, max_reviews = $2, show_badge = $3,
           smart_filter = $4, show_review_button = $5, layout = $6,
           minimum_rating = $7, sort_order = $8, include_keywords = $9,
           exclude_keywords = $10, date_from = $11, date_to = $12,
           widget_locale = $13, widget_title = $14, background_color = $15,
           text_color = $16, accent_color = $17, show_reviewer_avatar = $18,
           show_reviewed_date = $19, allowed_domains = $20,
           show_rating_summary = $21, font_family = $22, card_density = $23, corner_style = $24
       WHERE id = $25 AND user_id = $26`,
      [
        settings.theme,
        settings.maxReviews,
        settings.showBadge,
        settings.smartFilter,
        settings.showReviewButton,
        settings.layout,
        settings.minimumRating,
        settings.sortOrder,
        settings.includeKeywords,
        settings.excludeKeywords,
        settings.dateFrom,
        settings.dateTo,
        settings.widgetLocale,
        settings.widgetTitle,
        settings.backgroundColor,
        settings.textColor,
        settings.accentColor,
        settings.showReviewerAvatar,
        settings.showReviewedDate,
        settings.allowedDomains,
        settings.showRatingSummary,
        settings.fontFamily,
        settings.cardDensity,
        settings.cornerStyle,
        widgetId,
        user.id,
      ]
    );
  } catch (error) {
    console.error("Widget update error:", error);
    return { error: "Failed to update widget settings." };
  }

  revalidatePath(`/dashboard/widget/${widgetId}`);
  return { success: true };
}

export async function setWidgetReviewPreferenceAction({ widgetId, reviewId, state }) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const profile = await queryOne("SELECT plan FROM public.users WHERE id = $1", [user.id]);
  const plan = profile?.plan || "free";
  if (!PLAN_LIMITS[plan]?.canModerateReviews) {
    return { error: "Review moderation requires a paid plan." };
  }

  if (!widgetId || !reviewId || !["hidden", "pinned", null].includes(state)) {
    return { error: "Invalid review preference." };
  }

  try {
    if (state === null) {
      await query(
        `DELETE FROM public.widget_review_preferences preference
         USING public.widgets widget
         WHERE preference.widget_id = widget.id
           AND widget.id = $1 AND widget.user_id = $2
           AND preference.review_id = $3`,
        [widgetId, user.id, reviewId]
      );
    } else {
      const saved = await queryOne(
        `INSERT INTO public.widget_review_preferences (widget_id, review_id, state)
         SELECT widget.id, review.id, $4
         FROM public.widgets widget
         JOIN public.reviews review ON review.source_id = widget.source_id
         WHERE widget.id = $1 AND widget.user_id = $2 AND review.id = $3
         ON CONFLICT (widget_id, review_id) DO UPDATE SET state = EXCLUDED.state
         RETURNING widget_id`,
        [widgetId, user.id, reviewId, state]
      );
      if (!saved) return { error: "Review not found for this widget." };
    }
  } catch (error) {
    console.error("Review moderation failed:", error);
    return { error: "Could not save review preference." };
  }

  revalidatePath(`/dashboard/widget/${widgetId}`);
  return { success: true };
}
