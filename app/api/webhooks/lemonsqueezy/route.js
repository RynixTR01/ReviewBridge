import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Webhooks run server-to-server without a user session.
// Use Supabase Service Role Key to bypass RLS.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // Find and update user by email or user_id
    let updateQuery = supabaseAdmin.from("users").update({ plan });

    if (userId) {
      updateQuery = updateQuery.eq("id", userId);
    } else if (userEmail) {
      updateQuery = updateQuery.eq("email", userEmail);
    }

    const { data: updatedUser, error } = await updateQuery.select('id').single();

    if (error) {
      console.error("Webhook update error:", error);
      return Response.json({ error: "Failed to update user plan" }, { status: 500 });
    }

    if (updatedUser?.id) {
      await supabaseAdmin.from("widgets").update({ user_plan: plan }).eq("user_id", updatedUser.id);
    }

    console.log(`Webhook processed: ${eventName} → plan=${plan} for ${userEmail || userId}`);
    return Response.json({ success: true, event: eventName, plan });

  } catch (err) {
    console.error("Webhook exception:", err);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
