"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { auth } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { billingApi } from "@/lib/billing";

export async function updateProfileAction(formData) {
  const fullName = formData.get("full_name")?.toString().trim();

  if (!fullName || fullName.length < 1 || fullName.length > 50) {
    return { error: "Full name must be between 1 and 50 characters." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  try {
    const profile = await queryOne(
      "UPDATE public.users SET full_name = $1 WHERE id = $2 RETURNING id",
      [fullName, user.id]
    );
    if (!profile) throw new Error("User profile not found.");
  } catch (error) {
    console.error("Profile update failed.", { code: error?.code });
    return { error: "Failed to update profile. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateNotificationPreferencesAction(formData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };
  const syncEnabled = formData.get("sync_failure_emails_enabled") === "on";
  const usageEnabled = formData.get("usage_limit_emails_enabled") === "on";
  const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
  if (!emailConfigured) {
    const current = await queryOne(
      "SELECT sync_failure_emails_enabled, usage_limit_emails_enabled FROM public.users WHERE id = $1",
      [user.id],
    );
    if ((syncEnabled && !current?.sync_failure_emails_enabled) || (usageEnabled && !current?.usage_limit_emails_enabled)) {
      return { emailNotConfigured: true };
    }
  }
  await query(
    "UPDATE public.users SET sync_failure_emails_enabled = $2, usage_limit_emails_enabled = $3 WHERE id = $1",
    [user.id, syncEnabled, usageEnabled],
  );
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteAccountAction(formData) {
  const confirmation = formData.get("confirmation")?.toString().trim();

  if (confirmation !== "DELETE") {
    return { error: "Please type DELETE to confirm account deletion." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Never remove the only link to a subscription that can still renew.
  // A provider failure leaves the user's account intact and retryable.
  try {
    const billing = await queryOne(
      "SELECT lemonsqueezy_subscription_id FROM public.users WHERE id = $1", [user.id],
    );
    if (billing?.lemonsqueezy_subscription_id) {
      const subscription = await billingApi.getSubscription(billing.lemonsqueezy_subscription_id);
      if (!["cancelled", "expired"].includes(subscription.attributes.status)) {
        await billingApi.cancelSubscription(billing.lemonsqueezy_subscription_id);
      }
    }
  } catch {
    return { error: "Account deletion was stopped because subscription cancellation could not be confirmed. Please try again or manage your subscription first." };
  }

  try {
    const deletedProfile = await queryOne(
      `WITH deleted_user AS (
         DELETE FROM public.users WHERE id = $1 RETURNING id
       ), deleted_billing_events AS (
         DELETE FROM public.lemonsqueezy_webhook_events
         WHERE user_key = (SELECT id::text FROM deleted_user)
         RETURNING event_hash
       )
       SELECT id FROM deleted_user`,
      [user.id],
    );
    if (!deletedProfile) return { error: "Account data could not be found. Please contact support." };
  } catch (error) {
    console.error("Delete ReviewBridge account data failed.", { name: error?.name });
    return { error: "Failed to delete account data. Please try again." };
  }

  // Remove application data first so a later identity-provider failure cannot
  // leave the customer's reviews, invitations, or profile orphaned in Neon.
  let authDeleteError = null;
  try {
    const result = await auth.deleteUser({});
    authDeleteError = result?.error || null;
  } catch (error) {
    authDeleteError = error;
  }
  if (authDeleteError) {
    console.error("Delete Neon Auth identity failed after application data removal.", { name: authDeleteError?.name });
    try { await auth.signOut(); } catch { /* the application data is already removed */ }
    return { error: "Your ReviewBridge data was deleted, but the sign-in could not be removed. Please contact support." };
  }

  try { await auth.signOut(); } catch { /* identity deletion already invalidated the account */ }

  redirect("/");
}
