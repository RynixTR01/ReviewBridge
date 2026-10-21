import { createHash } from "node:crypto";

export function deletionIdentityHash(identityId) {
  if (!identityId) throw new Error("An authenticated identity is required.");
  return createHash("sha256").update(`reviewbridge:deletion:${identityId}`).digest("hex");
}

export async function getAccountDeletion(database, identityId) {
  if (!identityId) return null;
  const [row] = await database.query(
    "SELECT requested_at,identity_deleted_at,attempts FROM public.account_deletions WHERE identity_hash=$1",
    [deletionIdentityHash(identityId)],
  );
  return row || null;
}

// Serialize deletion with profile creation for this exact identity. The ledger
// and cascading application deletion either both commit or both roll back.
export async function deleteApplicationAccount(database, userId, identityId, confirmedSubscriptionId = null) {
  const identityHash = deletionIdentityHash(identityId);
  const results = await database.transaction([
    database.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [identityHash]),
    database.query(
      `WITH owned AS (
         SELECT id FROM public.users WHERE id=$1 AND auth_user_id=$2
         AND lemonsqueezy_subscription_id IS NOT DISTINCT FROM $4::text
         AND (billing_checkout_expires_at IS NULL OR billing_checkout_expires_at<=now())
         FOR UPDATE
       ), journal AS (
         INSERT INTO public.account_deletions (identity_hash)
         SELECT $3 FROM owned ON CONFLICT (identity_hash) DO UPDATE SET identity_hash=EXCLUDED.identity_hash
         RETURNING identity_hash
       ), removed AS (
         DELETE FROM public.users WHERE id IN (SELECT id FROM owned)
         AND EXISTS (SELECT 1 FROM journal) RETURNING id
       ), events AS (
         DELETE FROM public.lemonsqueezy_webhook_events
         WHERE user_key IN (SELECT id::text FROM removed) RETURNING event_hash
       ) SELECT id FROM removed`,
      [userId, identityId, identityHash, confirmedSubscriptionId],
    ),
  ], { isolationLevel: "ReadCommitted" });
  return Boolean(results[1][0]);
}

export async function finishIdentityDeletion(database, identityId, deleteIdentity) {
  const key = deletionIdentityHash(identityId);
  const [claimed] = await database.query(
    `UPDATE public.account_deletions SET last_attempt_at=now(),attempts=attempts+1
     WHERE identity_hash=$1 AND identity_deleted_at IS NULL
     AND (last_attempt_at IS NULL OR last_attempt_at < now()-interval '30 seconds')
     RETURNING identity_hash`, [key],
  );
  if (!claimed) return { complete: false, retry: true };
  try {
    const result = await deleteIdentity();
    // A verification email being sent is not proof that the identity is gone.
    if (result?.error || result?.data?.success !== true || result?.data?.message !== "User deleted") return { complete: false, retry: true };
    await database.query(
      "UPDATE public.account_deletions SET identity_deleted_at=now() WHERE identity_hash=$1", [key],
    );
    return { complete: true };
  } catch {
    // The durable journal remains even if the response/acknowledgement was lost.
    // Never restore the profile or claim success on an ambiguous provider result.
    return { complete: false, retry: true };
  }
}
