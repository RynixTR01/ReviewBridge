import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createLemonSqueezyWebhookHandler } from "../app/lib/lemonsqueezy-webhook-handler.js";
import { resolveLemonSqueezyPlan, verifyLemonSqueezySignature } from "../lib/lemonsqueezy-webhook.js";
import { checkoutBinding } from "../lib/billing-state.js";
const secret = "handler-test-secret";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
process.env.LEMONSQUEEZY_STORE_ID = "321";
process.env.LEMONSQUEEZY_PRO_VARIANT_ID = "12345";
process.env.LEMONSQUEEZY_AGENCY_VARIANT_ID = "67890";
process.env.BILLING_MODE = "test";
function payload(overrides = {}) {
  return { meta: { event_name: "subscription_updated", custom_data: { user_id: "user-1", binding: checkoutBinding("user-1", "test", secret) } }, data: { type: "subscriptions", id: "789", attributes: { status: "active", variant_id: "12345", test_mode: true, store_id: 321, updated_at: "2026-10-20T00:00:00Z", ...overrides } } };
}
function request(value, signature) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return new Request("https://app.test/api/webhooks/lemonsqueezy", { method: "POST", body: raw, headers: { "x-signature": signature || crypto.createHmac("sha256", secret).update(raw).digest("hex") } });
}
function handler(result = { user_id: "user-1", updated_user_id: "user-1", claimed_count: 1, plan: "pro" }) {
  const calls = [];
  return { calls, post: createLemonSqueezyWebhookHandler({ resolveLemonSqueezyPlan, verifyLemonSqueezySignature, applyState: async (event) => { calls.push(event); return result; } }) };
}
test("only signed subscription states matching environment/store/product are persisted", async () => {
  for (const [input, status] of [[payload({ test_mode: false }), 422], [payload({ store_id: 999 }), 422], [payload({ variant_id: 999 }), 422], [payload({ updated_at: "bad" }), 422], ["invalid json", 400]]) {
    const { calls, post } = handler();
    assert.equal((await post(request(input))).status, status);
    assert.equal(calls.length, 0);
  }
  assert.equal((await handler().post(request(payload(), "invalid"))).status, 401);
});
test("valid event persists signed user binding and uses the applied plan", async () => {
  const { calls, post } = handler();
  const result = await post(request(payload()));
  assert.deepEqual(await result.json(), { success: true, event: "subscription_updated", plan: "pro" });
  assert.equal(calls[0].userId, "user-1");
  assert.match(calls[0].eventHash, /^[0-9a-f]{64}$/);
});
test("unsigned custom user ID and checkout email cannot select another account", async () => {
  const input = payload({ user_email: "victim@example.test" });
  input.meta.custom_data.binding = "invalid";
  const { calls, post } = handler(null);
  assert.equal((await post(request(input))).status, 409);
  assert.equal(calls[0].userId, null);
});
test("duplicate and stale events do not report a new plan grant", async () => {
  const duplicate = await handler({ user_id: "u", claimed_count: 0 }).post(request(payload()));
  assert.deepEqual(await duplicate.json(), { success: true, duplicate: true });
  const stale = await handler({ user_id: "u", claimed_count: 1 }).post(request(payload()));
  assert.deepEqual(await stale.json(), { success: true, stale: true });
});
test("irrelevant signed events are acknowledged without requiring a user identity", async () => {
  const { calls, post } = handler();
  assert.equal((await post(request({ meta: { event_name: "order_created" } }))).status, 200);
  assert.equal(calls.length, 0);
});
