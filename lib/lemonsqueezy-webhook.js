import crypto from "node:crypto";

const ACTIVE_SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_plan_changed",
]);

export function verifyLemonSqueezySignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function resolveLemonSqueezyPlan(eventName, attributes = {}, variantIds = {}) {
  if (eventName === "subscription_expired") return "free";
  if (eventName === "subscription_cancelled") return "unchanged";
  if (!ACTIVE_SUBSCRIPTION_EVENTS.has(eventName)) return "unhandled";

  const configuredProId = variantIds.pro || process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  const configuredAgencyId = variantIds.agency || process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID;
  const incomingVariantId = String(attributes.variant_id || attributes.first_order_item?.variant_id || "");
  if (configuredProId || configuredAgencyId) {
    if (configuredAgencyId && incomingVariantId === String(configuredAgencyId)) return "agency";
    if (configuredProId && incomingVariantId === String(configuredProId)) return "pro";
    return null;
  }

  const details = [
    attributes.product_name,
    attributes.variant_name,
    attributes.first_order_item?.variant_name,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/(^|[^a-z])agency([^a-z]|$)/i.test(details)) return "agency";
  if (/(^|[^a-z])pro([^a-z]|$)/i.test(details)) return "pro";
  return null;
}
