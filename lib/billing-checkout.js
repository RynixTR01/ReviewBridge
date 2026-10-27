import { createHash, randomUUID } from "node:crypto";
import { BillingError, safeBillingUrl } from "./billing-api.js";
import { billingMode } from "./billing-state.js";

// This is a checkout configuration key, not the user's subscription plan.
// Reuse the existing text column so deploying the fix needs no migration.
export function checkoutCacheKey(plan, env = process.env) {
  const variant = plan === "pro" ? env.LEMONSQUEEZY_PRO_VARIANT_ID
    : plan === "agency" ? env.LEMONSQUEEZY_AGENCY_VARIANT_ID : null;
  if (!variant || !/^\d+$/.test(variant) || !env.LEMONSQUEEZY_STORE_ID
    || !env.LEMONSQUEEZY_WEBHOOK_SECRET) throw new BillingError("not_configured");
  const fingerprint = createHash("sha256").update(JSON.stringify([
    billingMode(env), env.LEMONSQUEEZY_STORE_ID, variant,
    env.LEMONSQUEEZY_WEBHOOK_SECRET,
    env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app",
  ])).digest("hex");
  return `v2:${plan}:${fingerprint}`;
}

export async function getOrCreateBoundCheckout(user, plan, { queryOne, billingApi, env = process.env }) {
  const cacheKey = checkoutCacheKey(plan, env);
  const claim = randomUUID();
  const reserved = await queryOne(
    `UPDATE public.users SET billing_checkout_claim=$2, billing_checkout_url=NULL,
       billing_checkout_expires_at=now()+INTERVAL '2 minutes', billing_checkout_plan=$3
     WHERE id=$1 AND (lemonsqueezy_subscription_id IS NULL OR billing_status='expired')
       AND (billing_checkout_expires_at IS NULL OR billing_checkout_expires_at<=now()
         OR (billing_checkout_claim IS NULL AND billing_checkout_plan IS DISTINCT FROM $3))
     RETURNING id`, [user.id, claim, cacheKey],
  );
  if (!reserved) {
    const existing = await queryOne(
      `SELECT billing_checkout_url,billing_checkout_plan FROM public.users
       WHERE id=$1 AND billing_checkout_expires_at>now() AND billing_checkout_claim IS NULL
         AND billing_checkout_plan=$2
         AND (lemonsqueezy_subscription_id IS NULL OR billing_status='expired')`, [user.id, cacheKey],
    );
    const url = existing?.billing_checkout_plan === cacheKey && safeBillingUrl(existing.billing_checkout_url);
    if (url) return url;
    throw new BillingError("checkout_pending");
  }
  try {
    const site = env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
    const url = await billingApi.createCheckout({
      userId: user.id, email: user.email, plan,
      returnUrl: new URL("/dashboard/upgrade?billing=return", site).href,
    });
    const saved = await queryOne(
      `UPDATE public.users SET billing_checkout_url=$3,
         billing_checkout_expires_at=now()+INTERVAL '30 minutes', billing_checkout_claim=NULL
       WHERE id=$1 AND billing_checkout_claim=$2
         AND (lemonsqueezy_subscription_id IS NULL OR billing_status='expired') RETURNING id`,
      [user.id, claim, url],
    );
    if (!saved) throw new BillingError("checkout_pending");
    return url;
  } catch (error) {
    await queryOne(
      `UPDATE public.users SET billing_checkout_claim=NULL,billing_checkout_expires_at=NULL
       WHERE id=$1 AND billing_checkout_claim=$2 RETURNING id`, [user.id, claim],
    );
    throw error;
  }
}
