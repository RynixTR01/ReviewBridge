"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizeSupportTicket } from "@/lib/support-tickets";

export async function submitSupportTicket(formData) {
  const input = normalizeSupportTicket(formData);
  if (input.error === "spam") redirect("/contact?sent=1");
  if (input.error) redirect(`/contact?error=${input.error}`);

  const requestHeaders = await headers();
  if (await isRateLimited({ headers: requestHeaders }, "support-ticket", {
    limit: 3, windowMs: 24 * 60 * 60 * 1000, failClosed: true,
  })) redirect("/contact?error=rate");

  const { data: session } = await auth.getSession();
  const userId = session?.user?.emailVerified && session.user.email?.toLowerCase() === input.email
    ? (await query("SELECT id FROM public.users WHERE auth_user_id = $1", [session.user.id]))[0]?.id || null
    : null;

  try {
    await query(
      `INSERT INTO public.support_tickets (user_id, email, subject, message)
       VALUES ($1, $2, $3, $4)`,
      [userId, input.email, input.subject, input.message],
    );
  } catch {
    console.error("Support ticket could not be stored.");
    redirect("/contact?error=unavailable");
  }
  redirect("/contact?sent=1");
}
