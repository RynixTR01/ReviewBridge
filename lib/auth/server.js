import "server-only";
import { randomUUID } from "node:crypto";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { queryOne } from "@/lib/db";

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

  const existingProfile = await queryOne(
    `SELECT id, email, full_name, plan FROM public.users WHERE lower(email) = lower($1)`,
    [neonUser.email]
  );

  if (existingProfile) {
    return {
      ...neonUser,
      id: existingProfile.id,
      email: existingProfile.email,
      name: existingProfile.full_name || neonUser.name,
      plan: existingProfile.plan,
    };
  }

  const profile = await queryOne(
    `INSERT INTO public.users (id, email, full_name, plan)
     VALUES ($1, lower($2), $3, 'free')
     ON CONFLICT (lower(email)) DO NOTHING
     RETURNING id, email, full_name, plan`,
    [randomUUID(), neonUser.email, neonUser.name || null]
  );

  // Another concurrent request may have inserted the profile first.
  const resolvedProfile = profile ?? await queryOne(
    `SELECT id, email, full_name, plan FROM public.users WHERE lower(email) = lower($1)`,
    [neonUser.email]
  );

  if (!resolvedProfile) return null;

  return {
    ...neonUser,
    id: resolvedProfile.id,
    email: resolvedProfile.email,
    name: resolvedProfile.full_name || neonUser.name,
    plan: resolvedProfile.plan,
  };
}
