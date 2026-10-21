import { randomUUID } from "node:crypto";
import { deletionIdentityHash, getAccountDeletion } from "../account-deletion.js";

/** Verified identities may claim an unmigrated profile once, never rebind one. */
export async function resolveApplicationProfile(database, identity) {
  if (!identity?.id || !identity.email || identity.emailVerified !== true) return null;
  if (await getAccountDeletion(database, identity.id)) return null;
  const params = [String(identity.id), identity.email.toLowerCase()];
  const [bound] = await database.query(
    "SELECT id,email,full_name,plan FROM public.users WHERE auth_user_id=$1", [params[0]],
  );
  if (bound) {
    if (bound.email.toLowerCase() === params[1]) return bound;
    try {
      const [updated] = await database.query(
        `UPDATE public.users SET email=$2 WHERE auth_user_id=$1
         AND NOT EXISTS (SELECT 1 FROM public.users other WHERE lower(other.email)=$2 AND other.id<>public.users.id)
         RETURNING id,email,full_name,plan`, params,
      );
      return updated || null;
    } catch (error) {
      if (error.code === "23505") return null;
      throw error;
    }
  }
  try {
    const results = await database.transaction([
      database.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [deletionIdentityHash(identity.id)]),
      database.query(
      `INSERT INTO public.users (id,email,full_name,plan,auth_user_id)
       SELECT $1,lower($2),$3,'free',$4
       WHERE NOT EXISTS (SELECT 1 FROM public.account_deletions WHERE identity_hash=$5)
       ON CONFLICT (lower(email)) DO UPDATE SET auth_user_id=EXCLUDED.auth_user_id
       WHERE public.users.auth_user_id IS NULL OR public.users.auth_user_id=EXCLUDED.auth_user_id
       RETURNING id,email,full_name,plan`,
      [randomUUID(), params[1], identity.name || null, params[0], deletionIdentityHash(identity.id)],
    )], { isolationLevel: "ReadCommitted" });
    const [profile] = results[1];
    return profile || null;
  } catch (error) {
    if (error.code !== "23505") throw error;
    // Simultaneous callbacks from the same identity can race on the identity
    // index. Re-read only that exact identity+verified email, never another user.
    const [profile] = await database.query(
      "SELECT id,email,full_name,plan FROM public.users WHERE auth_user_id=$1 AND lower(email)=$2", params,
    );
    return profile || null;
  }
}
