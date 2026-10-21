import crypto from "node:crypto";

const ACTIVE_SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_plan_changed",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
]);

export function verifyLemonSqueezySignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function resolveLemonSqueezyPlan(eventName, attributes = {}, variantIds = {}, now = Date.now()) {
  if (!ACTIVE_SUBSCRIPTION_EVENTS.has(eventName)) return "unhandled";

  const configuredProId = variantIds.pro || process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  const configuredAgencyId = variantIds.agency || process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID;
  const incomingVariantId = String(attributes.variant_id || attributes.first_order_item?.variant_id || "");
  // Names and email fields are not product identifiers. Unknown products must
  // not grant or revoke access even on cancellation/expiry.
  const paidPlan = configuredAgencyId && incomingVariantId === String(configuredAgencyId) ? "agency"
    : configuredProId && incomingVariantId === String(configuredProId) ? "pro" : null;
  if (!paidPlan) return null;
  const status = attributes.status;
  // Reject contradictory lifecycle payloads instead of persisting an active
  // status for an expiry event (which a same-time retry could resurrect).
  if (eventName === "subscription_expired" && status !== "expired") return null;
  if (status === "expired" || status === "unpaid") return "free";
  if (status === "cancelled") {
    const endsAt = Date.parse(attributes.ends_at);
    if (!Number.isFinite(endsAt)) return null;
    return endsAt > now ? paidPlan : "free";
  }
  if (status === "on_trial") {
    const endsAt = Date.parse(attributes.trial_ends_at);
    if (!Number.isFinite(endsAt)) return null;
    return endsAt > now ? paidPlan : "free";
  }
  if (status === "paused") return attributes.pause?.mode === "free" ? paidPlan : "free";
  // During Lemon's payment recovery period access continues. It ends when
  // recovery is exhausted (unpaid), not on the next invoice's renews_at date.
  if (status === "active" || status === "past_due") return paidPlan;
  return null;
}
