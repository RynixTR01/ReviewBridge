import crypto from "node:crypto";

/**
 * Creates a Lemon Squeezy callback handler with an injectable database lookup
 * so signature and subscription-event behavior can be verified without Neon.
 */
export function createLemonSqueezyWebhookHandler({
  queryOne,
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
}) {
  return async function POST(request) {
    try {
      const rawBody = await request.text();
      const signature = request.headers.get("x-signature") || "";
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

      if (!secret) {
        console.error("Lemon Squeezy webhook secret is not configured.");
        return Response.json({ error: "Webhook verification is unavailable" }, { status: 503 });
      }
      if (!verifyLemonSqueezySignature(rawBody, signature, secret)) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }

      const payload = JSON.parse(rawBody);
      const eventName = payload.meta?.event_name;
      if (typeof eventName !== "string") {
        return Response.json({ error: "Invalid webhook event" }, { status: 400 });
      }

      const userEmail = payload.data?.attributes?.user_email;
      const customData = payload.meta?.custom_data || {};
      const userId = customData.user_id;

      if (!userEmail && !userId) {
        console.error("Webhook: No user_email or user_id found in payload");
        return Response.json({ error: "No user identifier in payload" }, { status: 400 });
      }

      const plan = resolveLemonSqueezyPlan(eventName, payload.data?.attributes, {
        pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
        agency: process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID,
      });
      if (plan === "unhandled") {
        console.log("Unhandled webhook event:", eventName);
        return Response.json({ success: true, message: "Event not handled" });
      }
      if (plan === null) {
        console.error("Webhook: Could not match subscription to a known plan", eventName);
        return Response.json({ error: "Unknown subscription plan" }, { status: 422 });
      }

      const eventHash = crypto.createHash("sha256").update(rawBody).digest("hex");
      const rawEventTime = payload.data?.attributes?.updated_at;
      const parsedEventTime = rawEventTime ? new Date(rawEventTime) : new Date();
      const eventAt = Number.isNaN(parsedEventTime.getTime()) ? new Date().toISOString() : parsedEventTime.toISOString();
      const result = await queryOne(
        `WITH target_user AS (
           SELECT id
           FROM public.users
           WHERE ($3::text IS NOT NULL AND id::text = $3)
              OR ($3::text IS NULL AND $4::text IS NOT NULL AND lower(email) = lower($4))
           LIMIT 1
         ), claimed_event AS (
           INSERT INTO public.lemonsqueezy_webhook_events (event_hash, event_name, user_key, subscription_id, event_at)
           SELECT $1, $2, id::text, $5, $7::timestamptz FROM target_user
           ON CONFLICT (event_hash) DO NOTHING
           RETURNING event_hash
         ), updated_user AS (
           UPDATE public.users
           SET plan = $6,
               lemonsqueezy_subscription_id = CASE WHEN $6 = 'free' THEN lemonsqueezy_subscription_id ELSE $5 END
           WHERE id IN (SELECT id FROM target_user)
             AND EXISTS (SELECT 1 FROM claimed_event)
             AND $6 <> 'unchanged'
             AND ($6 <> 'free' OR lemonsqueezy_subscription_id IS NULL OR lemonsqueezy_subscription_id = $5)
             AND NOT EXISTS (
               SELECT 1 FROM public.lemonsqueezy_webhook_events newer
               WHERE newer.user_key = (SELECT id::text FROM target_user LIMIT 1)
                 AND newer.event_at > $7::timestamptz
             )
           RETURNING id
         ), updated_widgets AS (
           UPDATE public.widgets
           SET user_plan = $6
           WHERE user_id IN (SELECT id FROM updated_user)
           RETURNING user_id
         )
         SELECT (SELECT count(*) FROM claimed_event)::int AS claimed_count,
                (SELECT id FROM target_user LIMIT 1) AS user_id,
                (SELECT id FROM updated_user LIMIT 1) AS updated_user_id`,
        [eventHash, eventName, userId || null, userEmail || null, String(payload.data?.id || ""), plan, eventAt]
      );

      if (!result?.user_id) {
        console.error("Webhook could not resolve a user");
        return Response.json({ error: "Failed to resolve user for subscription" }, { status: 500 });
      }
      if (result.claimed_count === 0) {
        return Response.json({ success: true, duplicate: true });
      }

      if (plan === "unchanged") {
        return Response.json({ success: true, message: "Cancellation noted; plan remains active until expiry" });
      }
      if (!result.updated_user_id) {
        return Response.json({ success: true, stale: true, message: "Older subscription event ignored" });
      }

      console.log(`Webhook processed: ${eventName} → plan=${plan} for ${userEmail || userId}`);
      return Response.json({ success: true, event: eventName, plan });
    } catch (err) {
      console.error("Webhook exception:", err);
      return Response.json({ error: "Webhook handler failed" }, { status: 500 });
    }
  };
}
