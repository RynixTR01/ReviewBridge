"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getUserOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function markNotificationReadAction(formData) {
  const user = await getUserOrRedirect();
  const notificationId = String(formData.get("notificationId") || "");
  if (!UUID.test(notificationId)) return;
  await query(
    "UPDATE public.user_notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL",
    [notificationId, user.id],
  );
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getUserOrRedirect();
  await query(
    "UPDATE public.user_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
    [user.id],
  );
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
}
