"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { auth } from "@/lib/auth/server";
import { getNeonClient, query, queryOne } from "@/lib/db";
import { deleteApplicationAccount, finishIdentityDeletion, getAccountDeletion } from "@/lib/account-deletion";
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
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) return { error: "Not authenticated." };

  // Never remove the only link to a subscription that can still renew.
  // A provider failure leaves the user's account intact and retryable.
  let confirmedSubscriptionId = null;
  try {
    const billing = await queryOne(
      "SELECT lemonsqueezy_subscription_id FROM public.users WHERE id = $1", [user.id],
    );
    if (billing?.lemonsqueezy_subscription_id) {
      confirmedSubscriptionId = billing.lemonsqueezy_subscription_id;
      const subscription = await billingApi.getSubscription(billing.lemonsqueezy_subscription_id);
      if (!["cancelled", "expired"].includes(subscription.attributes.status)) {
        await billingApi.cancelSubscription(billing.lemonsqueezy_subscription_id);
      }
    }
  } catch {
    return { error: "Account deletion was stopped because subscription cancellation could not be confirmed. Please try again or manage your subscription first." };
  }

  try {
    const deletedProfile = await deleteApplicationAccount(getNeonClient(), user.id, session.user.id, confirmedSubscriptionId);
    if (!deletedProfile) return { error: "A checkout may still be open or the subscription changed. Wait for the checkout to expire (up to 30 minutes), then retry.", deletionPendingCheckout: true };
  } catch (error) {
    console.error("Delete ReviewBridge account data failed.", { name: error?.name });
    return { error: "Failed to delete account data. Please try again." };
  }

  const result = await finishIdentityDeletion(getNeonClient(), session.user.id, () => auth.deleteUser({}));
  if (!result.complete) redirect("/account-deletion");
  try { await auth.signOut(); } catch { /* identity deletion already invalidated the account */ }
  redirect("/");
}

export async function retryAccountDeletionAction() {
  // Recovery does not create a profile or trust a user-supplied identity ID.
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect("/login?next=%2Faccount-deletion");
  const job = await getAccountDeletion(getNeonClient(), session.user.id);
  if (!job) redirect("/dashboard");
  const result = await finishIdentityDeletion(getNeonClient(), session.user.id, () => auth.deleteUser({}));
  if (!result.complete) redirect("/account-deletion?retry=1");
  try { await auth.signOut(); } catch { /* deletion invalidates the identity */ }
  redirect("/");
}
