import crypto from "crypto";
import { query, queryOne } from "@/lib/db";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.warn("Lemon Squeezy secret not configured. Skipping signature verification.");
    } else {
      // Verify HMAC signature
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");

      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;

    // Get user email from webhook payload
    const userEmail = payload.data?.attributes?.user_email;
    
    // Also check custom_data for user_id as fallback
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;

    if (!userEmail && !userId) {
      console.error("Webhook: No user_email or user_id found in payload");
      return Response.json({ error: "No user identifier in payload" }, { status: 400 });
    }

    // Determine the plan from the product/variant name
    let plan = "free";

    const productName = (payload.data?.attributes?.product_name || "").toLowerCase();
    const variantName = (payload.data?.attributes?.variant_name || "").toLowerCase();
    const firstOrderVariant = (payload.data?.attributes?.first_order_item?.variant_name || "").toLowerCase();
    const combined = `${productName} ${variantName} ${firstOrderVariant}`;

    function detectPlan(text) {
      if (text.includes("agency")) return "agency";
      if (text.includes("pro")) return "pro";
      return null;
    }

    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_plan_changed"
    ) {
      plan = detectPlan(combined) || "pro";
    } else if (eventName === "subscription_cancelled") {
      // Keep current plan until it actually expires
      // Lemon Squeezy will send subscription_expired when the period ends
      console.log("Subscription cancelled — keeping plan until expiry");
      return Response.json({ success: true, message: "Cancellation noted, plan unchanged until expiry" });
    } else if (eventName === "subscription_expired") {
      plan = "free";
    } else {
      console.log("Unhandled webhook event:", eventName);
      return Response.json({ success: true, message: "Event not handled" });
    }

    // Prefer the account ID when supplied, otherwise resolve by email.
    const updatedUser = userId
      ? await queryOne(
          'UPDATE public.users SET plan = $2 WHERE id = $1 RETURNING id',
          [userId, plan]
        )
      : await queryOne(
          'UPDATE public.users SET plan = $2 WHERE email = $1 RETURNING id',
          [userEmail, plan]
        );

    if (!updatedUser) {
      console.error("Webhook update did not match a user");
      return Response.json({ error: "Failed to update user plan" }, { status: 500 });
    }

    await query('UPDATE public.widgets SET user_plan = $2 WHERE user_id = $1', [updatedUser.id, plan]);

    console.log(`Webhook processed: ${eventName} → plan=${plan} for ${userEmail || userId}`);
    return Response.json({ success: true, event: eventName, plan });

  } catch (err) {
    console.error("Webhook exception:", err);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
