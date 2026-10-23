"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { isSupportAdmin } from "@/lib/support-tickets";

export async function resolveSupportTicket(formData) {
  const user = await getCurrentUser();
  if (!isSupportAdmin(user)) throw new Error("Forbidden");
  const id = String(formData.get("id") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid ticket");
  }
  await query("UPDATE public.support_tickets SET status='resolved', resolved_at=now() WHERE id=$1 AND status='open'", [id]);
  revalidatePath("/dashboard/support");
}
