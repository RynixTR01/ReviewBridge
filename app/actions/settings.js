"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { auth } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    console.error("Update profile error:", error);
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

  const { error: authDeleteError } = await auth.deleteUser({});
  if (authDeleteError) {
    console.error("Delete Neon Auth user error:", authDeleteError);
    return { error: "Could not delete the login. Please try again or contact support." };
  }

  try {
    await query("DELETE FROM public.users WHERE id = $1", [user.id]);
  } catch (error) {
    console.error("Delete Neon account data error:", error);
    return { error: "Failed to delete account data. Please try again." };
  }

  await auth.signOut();

  redirect("/");
}
