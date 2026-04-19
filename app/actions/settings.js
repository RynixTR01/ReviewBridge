"use server";

import { createClient } from "@/lib/supabase/server";
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

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
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

  // Use service role to bypass RLS for cascading deletions
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Get all source IDs for the user
  const { data: sources } = await serviceSupabase
    .from("sources")
    .select("id")
    .eq("user_id", user.id);

  const sourceIds = (sources || []).map((s) => s.id);

  // 2. Delete all reviews for user's sources
  if (sourceIds.length > 0) {
    await serviceSupabase
      .from("reviews")
      .delete()
      .in("source_id", sourceIds);
  }

  // 3. Delete all widgets for user
  await serviceSupabase
    .from("widgets")
    .delete()
    .eq("user_id", user.id);

  // 4. Delete all sources for user
  await serviceSupabase
    .from("sources")
    .delete()
    .eq("user_id", user.id);

  // 5. Delete user from public.users table
  await serviceSupabase
    .from("users")
    .delete()
    .eq("id", user.id);

  // 6. Sign out
  await supabase.auth.signOut();

  redirect("/");
}
