import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getNeonClient, queryOne } from "@/lib/db";
import { applySubscriptionState } from "./billing-state";
import { createBillingApi, BillingError, safeBillingUrl } from "./billing-api";
import { resolveLemonSqueezyPlan } from "./lemonsqueezy-webhook";

export const billingApi = createBillingApi();

export async function refreshSubscription(userId) {
  const profile = await queryOne(
    "SELECT lemonsqueezy_subscription_id FROM public.users WHERE id = $1", [userId],
  );
  if (!profile?.lemonsqueezy_subscription_id) return null;
  const data = await billingApi.getSubscription(profile.lemonsqueezy_subscription_id);
  const plan = resolveLemonSqueezyPlan("subscription_updated", data.attributes);
  if (!plan) throw new BillingError("invalid_subscription");
  const result = await applySubscriptionState(getNeonClient(), {
    data, plan, eventName: "subscription_updated",
    // Resolves exclusively by subscription ID already owned by the account.
    eventHash: createHash("sha256").update(`reconcile:${data.id}:${JSON.stringify(data.attributes)}:${new Date().toISOString()}`).digest("hex"),
  });
  if (result?.user_id !== userId) throw new BillingError("invalid_subscription");
  return data;
}

export async function getBillingPortal(userId) {
  const data = await refreshSubscription(userId);
  const url = safeBillingUrl(data?.attributes?.urls?.customer_portal);
  if (!url) throw new BillingError("portal_unavailable");
  return url;
}

export async function getOrCreateCheckout(user, plan) {
  const claim = randomUUID();
  const reserved = await queryOne(
    `UPDATE public.users SET billing_checkout_claim=$2, billing_checkout_url=NULL,
       billing_checkout_expires_at=now()+INTERVAL '2 minutes', billing_checkout_plan=$3
     WHERE id=$1 AND (lemonsqueezy_subscription_id IS NULL OR billing_status='expired')
       AND (billing_checkout_expires_at IS NULL OR billing_checkout_expires_at<=now())
     RETURNING id`, [user.id, claim, plan],
  );
  if (!reserved) {
    const existing = await queryOne(
      `SELECT billing_checkout_url,billing_checkout_plan FROM public.users
       WHERE id=$1 AND billing_checkout_expires_at>now() AND billing_checkout_claim IS NULL
         AND (lemonsqueezy_subscription_id IS NULL OR billing_status='expired')`, [user.id],
    );
    const url = existing?.billing_checkout_plan === plan && safeBillingUrl(existing.billing_checkout_url);
    if (url) return url;
    throw new BillingError("checkout_pending");
  }
  try {
    const site = process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
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
