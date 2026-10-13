"use server";

import { createClient } from "@/lib/supabase/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function updateProfileAction(formData) {
  const fullName = formData.get("full_name")?.toString().trim();

  if (!fullName || fullName.length < 1 || fullName.length > 50) {
    return { error: "Full name must be between 1 and 50 characters." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

export async function deleteAccountAction(formData) {
  const confirmation = formData.get("confirmation")?.toString().trim();

  if (confirmation !== "DELETE") {
    return { error: "Please type DELETE to confirm account deletion." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Supabase remains the authentication provider; its admin client is used only
  // to remove the auth identity after the Neon application data is deleted.
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    await query("DELETE FROM public.users WHERE id = $1", [user.id]);
  } catch (error) {
    console.error("Delete Neon account data error:", error);
    return { error: "Failed to delete account data. Please try again." };
  }

  // The Neon foreign keys cascade the profile deletion to sources, reviews,
  // and widgets. Keep account deletion in Supabase Auth for now.
  const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    console.error("Delete Supabase auth user error:", authDeleteError);
    return { error: "Account data was deleted, but the login could not be removed." };
  }

  await supabase.auth.signOut();

  redirect("/");
}
