import crypto from "node:crypto";
import { BILLING_EVENTS, billingMode, validCheckoutBinding, validateSubscription } from "../../lib/billing-state.js";

export function createLemonSqueezyWebhookHandler({
  applyState, resolveLemonSqueezyPlan, verifyLemonSqueezySignature,
}) {
  return async function POST(request) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) return Response.json({ error: "Webhook verification is unavailable" }, { status: 503 });
    let rawBody;
    try {
      rawBody = await request.text();
      if (rawBody.length > 128_000) return Response.json({ error: "Payload too large" }, { status: 413 });
    } catch { return Response.json({ error: "Invalid payload" }, { status: 400 }); }
    if (!verifyLemonSqueezySignature(rawBody, request.headers.get("x-signature") || "", secret)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
    let payload;
    try { payload = JSON.parse(rawBody); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const eventName = payload?.meta?.event_name;
    if (typeof eventName !== "string") return Response.json({ error: "Invalid webhook event" }, { status: 400 });
    if (!BILLING_EVENTS.has(eventName)) return Response.json({ success: true, message: "Event not handled" });
    const invalid = validateSubscription(payload.data);
    if (invalid) return Response.json({ error: invalid }, { status: invalid === "not_configured" ? 503 : 422 });
    const plan = resolveLemonSqueezyPlan(eventName, payload.data.attributes, {
      pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
      agency: process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID,
    });
    if (!plan || plan === "unhandled") return Response.json({ error: "Unknown subscription state or plan" }, { status: 422 });
    const custom = payload.meta.custom_data || {};
    // Existing subscriptions resolve by the stored subscription ID. A new
    // purchase can bind only through a server-signed checkout, never its email.
    const userId = validCheckoutBinding(custom.user_id, billingMode(), custom.binding, secret) ? custom.user_id : null;
    try {
      const result = await applyState({
        data: payload.data, eventName, plan, userId,
        eventHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
      });
      if (!result?.user_id) return Response.json({ error: "Subscription account not linked" }, { status: 409 });
      if (result.conflict) {
        console.error("Conflicting subscription requires billing review.");
        return Response.json({ error: "Subscription conflict" }, { status: 409 });
      }
      if (!result.claimed_count) return Response.json({ success: true, duplicate: true });
      if (!result.updated_user_id) return Response.json({ success: true, stale: true });
      return Response.json({ success: true, event: eventName, plan: result.plan });
    } catch (error) {
      console.error("Lemon Squeezy webhook processing failed.", { name: error?.name });
      return Response.json({ error: "Webhook handler failed" }, { status: 500 });
    }
  };
}
