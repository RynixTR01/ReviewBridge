"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateWidgetAction(formData) {
  const widgetId = formData.get("widgetId");
  const theme = formData.get("theme");
  let maxReviews = parseInt(formData.get("maxReviews"), 10);
  let showBadge = formData.get("showBadge") === "true" || formData.get("showBadge") === true;
  const rawSmartFilter = formData.get("smartFilter");
  let smartFilter = rawSmartFilter === "on" || rawSmartFilter === "true" || rawSmartFilter === true;
  const showReviewButton = formData.get("showReviewButton") === "true" || formData.get("showReviewButton") === "on";

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

  if (userPlan === 'free' && maxReviews > 10) {
    maxReviews = 10;
  }

  if (userPlan === 'free') {
    showBadge = true;
    smartFilter = false;
  }

  // Update widget settings
  try {
    await query(
      `UPDATE public.widgets
       SET theme = $1, max_reviews = $2, show_badge = $3,
           smart_filter = $4, show_review_button = $5
       WHERE id = $6 AND user_id = $7`,
      [
        theme || "light",
        Number.isNaN(maxReviews) ? 5 : maxReviews,
        showBadge,
        smartFilter,
        showReviewButton,
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
