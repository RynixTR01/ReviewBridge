import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getNeonClient, queryOne } from "@/lib/db";
import { expireBillingForUser } from "@/lib/billing-state";
import { toApplicationUser } from "@/lib/auth/user-dto";
import { resolveApplicationProfile } from "./profile-binding";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
  },
});

/**
 * Return the verified Neon identity with the existing ReviewBridge profile ID.
 * This keeps current sources and widgets attached to the same profile after
 * users verify their email and create their Neon Auth account.
 */
export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  const neonUser = session?.user;

  // Never attach existing customer data to an unverified email address.
  if (!neonUser?.email || !neonUser.emailVerified) return null;

  const profile = await resolveApplicationProfile(getNeonClient(), neonUser);
  if (!profile) return null;
  await expireBillingForUser(getNeonClient(), profile.id);
  const current = await queryOne("SELECT plan FROM public.users WHERE id=$1", [profile.id]);
  if (current) profile.plan = current.plan;
  return toApplicationUser(neonUser, profile);
}
