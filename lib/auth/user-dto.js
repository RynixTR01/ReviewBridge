/** Return only the application fields that callers need. */
export function toApplicationUser(authUser, profile) {
  if (!authUser?.email || authUser.emailVerified !== true || !profile?.id) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name || authUser.name || null,
    plan: profile.plan || "free",
  };
}
