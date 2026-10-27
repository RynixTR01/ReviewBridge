import "server-only";
import { createHash } from "node:crypto";
import { getNeonClient, queryOne } from "@/lib/db";
import { applySubscriptionState } from "./billing-state";
import { createBillingApi, BillingError, safeBillingUrl } from "./billing-api";
import { resolveLemonSqueezyPlan } from "./lemonsqueezy-webhook";
import { getOrCreateBoundCheckout } from "./billing-checkout";

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
  return getOrCreateBoundCheckout(user, plan, { queryOne, billingApi });
}
