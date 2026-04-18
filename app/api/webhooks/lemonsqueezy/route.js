import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Note: Webhooks run server-to-server without a user session.
// To bypass RLS and update the users table, you MUST use the 
// Supabase Service Role Key (not the anon key).
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
      // Verify signature
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");

      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const customData = payload.meta.custom_data || {};
    
    // Lemon Squeezy passes custom_data.user_id if provided during checkout
    const userId = customData.user_id;

    if (!userId) {
      return Response.json({ error: "No user_id found in custom_data" }, { status: 400 });
    }

    let plan = "free";

    // Handle subscription events
    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      // Map product/variant IDs to your plans. For this example, we infer from payload
      const variantName = (payload.data?.attributes?.first_order_item?.variant_name || "").toLowerCase();
      
      if (variantName.includes("agency")) {
        plan = "agency";
      } else if (variantName.includes("pro")) {
        plan = "pro";
      } else {
        // Fallback or explicit evaluation based on product ID
        plan = "pro"; 
      }
    } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      plan = "free";
    }

    // Update user plan in Supabase
    const { error } = await supabaseAdmin
      .from("users")
      .update({ plan })
      .eq("id", userId);

    if (error) {
      console.error("Webhook update error:", error);
      return Response.json({ error: "Failed to update user plan" }, { status: 500 });
    }

    return Response.json({ success: true, plan });

  } catch (err) {
    console.error("Webhook exception:", err);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
