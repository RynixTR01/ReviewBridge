"use server";

import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();
  const userPlan = profile?.plan || "free";

  if (userPlan === 'free' && maxReviews > 10) {
    maxReviews = 10;
  }

  if (userPlan === 'free') {
    showBadge = true;
    smartFilter = false;
  }

  // Update widget settings
  const { error } = await supabase
    .from("widgets")
    .update({
      theme: theme || "light",
      max_reviews: isNaN(maxReviews) ? 5 : maxReviews,
      show_badge: showBadge,
      smart_filter: smartFilter,
      show_review_button: showReviewButton,
    })
    .eq("id", widgetId)
    .eq("user_id", user.id); // Ensure user owns the widget

  if (error) {
    console.error("Widget update error:", error);
    return { error: "Failed to update widget settings." };
  }

  revalidatePath(`/dashboard/widget/${widgetId}`);
  return { success: true };
}
