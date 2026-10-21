import { createHmac, timingSafeEqual } from "node:crypto";

export const BILLING_EVENTS = new Set([
  "subscription_created", "subscription_updated", "subscription_plan_changed",
  "subscription_cancelled", "subscription_expired", "subscription_resumed",
  "subscription_paused", "subscription_unpaused",
]);

export function billingMode(env = process.env) {
  return env.BILLING_MODE === "live" ? "live" : "test";
}

export function checkoutBinding(userId, mode, secret) {
  if (!secret || !userId || !["live", "test"].includes(mode)) throw new Error("Billing binding unavailable.");
  return createHmac("sha256", secret).update(`reviewbridge:checkout:v1:${mode}:${userId}`).digest("hex");
}

export function validCheckoutBinding(userId, mode, signature, secret) {
  if (!secret || typeof userId !== "string" || typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(checkoutBinding(userId, mode, secret), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function validateSubscription(data, env = process.env) {
  const a = data?.attributes;
  if (data?.type !== "subscriptions" || !/^\d+$/.test(String(data?.id || "")) || !a) return "invalid_subscription";
  if (typeof a.test_mode !== "boolean" || a.test_mode !== (billingMode(env) === "test")) return "wrong_mode";
  if (!env.LEMONSQUEEZY_STORE_ID) return "not_configured";
  if (String(a.store_id) !== env.LEMONSQUEEZY_STORE_ID) return "wrong_store";
  if (!Number.isFinite(Date.parse(a.updated_at))) return "invalid_date";
  for (const key of ["ends_at", "trial_ends_at", "renews_at"]) {
    if (a[key] != null && !Number.isFinite(Date.parse(a[key]))) return "invalid_date";
  }
  return null;
}

// Conservative deterministic tie-break: a terminal event at the same provider
// timestamp must win over a delayed active update.
export function subscriptionEventRank(status) {
  return { active: 1, on_trial: 1, past_due: 2, paused: 3, cancelled: 4, unpaid: 5, expired: 6 }[status] || 0;
}

export async function applySubscriptionState(database, {
  data, eventName, eventHash, plan, userId = null,
}) {
  const a = data.attributes;
  const params = [
    eventHash, eventName, userId, String(data.id), plan, a.updated_at,
    a.status, a.test_mode, String(a.store_id), String(a.customer_id || ""),
    String(a.variant_id), a.ends_at || null, a.trial_ends_at || null,
    a.renews_at || null, subscriptionEventRank(a.status),
  ];
  // Lock in a separate READ COMMITTED statement so queued requests see the
  // preceding commit. The webhook ledger and plan/widget update are atomic.
  const [, rows] = await database.transaction([
    database.query(
      `SELECT id FROM public.users
       WHERE ($1::text IS NOT NULL AND id::text = $1)
          OR ($1::text IS NULL AND lemonsqueezy_subscription_id = $2)
       ORDER BY id FOR UPDATE`,
      [userId, String(data.id)],
    ),
    database.query(
      `WITH target AS MATERIALIZED (
         SELECT * FROM public.users
         WHERE ($3::text IS NOT NULL AND id::text = $3)
            OR ($3::text IS NULL AND lemonsqueezy_subscription_id = $4)
         LIMIT 1
       ), claimed AS (
         INSERT INTO public.lemonsqueezy_webhook_events
           (event_hash, event_name, user_key, subscription_id, event_at)
         SELECT $1, $2, id::text, $4, $6::timestamptz FROM target
         WHERE (lemonsqueezy_subscription_id IS NULL OR lemonsqueezy_subscription_id=$4
           OR (COALESCE(billing_status='expired',false) AND $3::text IS NOT NULL))
           AND (billing_test_mode IS NULL OR billing_test_mode=$8)
         ON CONFLICT (event_hash) DO NOTHING RETURNING event_hash
       ), changed AS (
         UPDATE public.users u
         SET plan = CASE WHEN $7 = 'past_due'
                    AND COALESCE(u.billing_past_due_since, $6::timestamptz) <= now() - INTERVAL '14 days'
                    THEN 'free' ELSE $5 END,
             lemonsqueezy_subscription_id = $4,
             billing_status = $7, billing_test_mode = $8, billing_store_id = $9,
             billing_customer_id = $10, billing_variant_id = $11,
             billing_updated_at = $6::timestamptz, billing_event_rank = $15,
             billing_ends_at = $12::timestamptz, billing_trial_ends_at = $13::timestamptz,
             billing_renews_at = $14::timestamptz, billing_checked_at = now(),
             billing_checkout_url = NULL, billing_checkout_claim = NULL, billing_checkout_expires_at = NULL,
             billing_past_due_since = CASE WHEN $7 = 'past_due'
               THEN COALESCE(u.billing_past_due_since, $6::timestamptz) ELSE NULL END
         WHERE u.id IN (SELECT id FROM target)
           AND EXISTS (SELECT 1 FROM claimed)
           AND (u.lemonsqueezy_subscription_id IS NULL OR u.lemonsqueezy_subscription_id = $4
             OR (u.billing_status = 'expired' AND $3::text IS NOT NULL))
           AND (u.billing_test_mode IS NULL OR u.billing_test_mode = $8)
           AND (u.billing_updated_at IS NULL OR u.billing_updated_at < $6::timestamptz
             OR (u.billing_updated_at = $6::timestamptz AND u.billing_event_rank <= $15))
         RETURNING id, plan
       ), widgets AS (
         UPDATE public.widgets w SET user_plan = changed.plan
         FROM changed WHERE w.user_id = changed.id RETURNING w.id
       )
       SELECT (SELECT id FROM target) AS user_id,
              (SELECT count(*)::int FROM claimed) AS claimed_count,
              (SELECT id FROM changed) AS updated_user_id,
              (SELECT plan FROM changed) AS plan,
              (SELECT NOT (
                (lemonsqueezy_subscription_id IS NULL OR lemonsqueezy_subscription_id=$4
                  OR (COALESCE(billing_status='expired',false) AND $3::text IS NOT NULL))
                AND (billing_test_mode IS NULL OR billing_test_mode=$8)
              ) FROM target) AS conflict`,
      params,
    ),
  ], { isolationLevel: "ReadCommitted" });
  return rows?.[0];
}

// Used before authenticated access and by daily maintenance. renews_at is never
// an expiry deadline; a successful renewal must not lose access each month.
export const EXPIRE_BILLING_SQL = `
  WITH expired AS (
    UPDATE public.users SET plan = 'free'
    WHERE ($1::uuid IS NULL OR id = $1) AND plan <> 'free' AND (
      billing_status IN ('expired', 'unpaid')
      OR (billing_status = 'cancelled' AND billing_ends_at <= now())
      OR (billing_status = 'on_trial' AND billing_trial_ends_at <= now())
      OR (billing_status = 'past_due' AND billing_past_due_since <= now() - INTERVAL '14 days')
    )
    RETURNING id
  )
  UPDATE public.widgets SET user_plan = 'free'
  WHERE user_id IN (SELECT id FROM expired)
  RETURNING user_id
`;

export async function expireBillingForUser(database, userId) {
  // Anonymous/background callers must use the explicit maintenance function,
  // not accidentally trigger an account-wide update with an empty identifier.
  if (!userId) return [];
  return database.query(EXPIRE_BILLING_SQL, [userId]);
}
