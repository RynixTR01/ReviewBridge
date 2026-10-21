import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { resolveLemonSqueezyPlan, verifyLemonSqueezySignature } from "../lib/lemonsqueezy-webhook.js";
import { checkoutBinding, validCheckoutBinding, validateSubscription } from "../lib/billing-state.js";
const ids = { pro: "12345", agency: "67890" };
const now = Date.parse("2026-10-20T00:00:00Z");
const resolve = (status, extra = {}, event = "subscription_updated") => resolveLemonSqueezyPlan(event, { variant_id: 12345, status, ...extra }, ids, now);
test("webhook signatures reject modified body, wrong secret and malformed hex", () => {
  const body = '{"test":true}';
  const signature = crypto.createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifyLemonSqueezySignature(body, signature, "secret"), true);
  for (const [b, s, key] of [[body + " ", signature, "secret"], [body, signature, "wrong"], [body, "bad", "secret"], [body, signature, ""]]) assert.equal(verifyLemonSqueezySignature(b, s, key), false);
});
test("expired/unpaid subscription_updated never grants a paid plan", () => {
  assert.equal(resolve("expired"), "free");
  assert.equal(resolve("unpaid"), "free");
  assert.equal(resolve("active", {}, "subscription_expired"), null);
  assert.equal(resolve("expired", {}, "subscription_expired"), "free");
});
test("renewal date is not an entitlement expiry; payment retries keep temporary access", () => {
  assert.equal(resolve("active", { renews_at: "2026-10-19T00:00:00Z" }), "pro");
  assert.equal(resolve("past_due"), "pro");
  assert.equal(resolve("active", { variant_id: 67890 }), "agency");
});
test("cancelled plans and trials expire at exact provider deadlines", () => {
  for (const status of ["cancelled", "on_trial"]) {
    const key = status === "cancelled" ? "ends_at" : "trial_ends_at";
    assert.equal(resolve(status, { [key]: "2026-10-21T00:00:00Z" }), "pro");
    assert.equal(resolve(status, { [key]: "2026-10-20T00:00:00Z" }), "free");
    assert.equal(resolve(status, { [key]: "invalid" }), null);
    assert.equal(resolve(status), null);
  }
});
test("unknown products/statuses and missing IDs fail closed; name cannot grant access", () => {
  assert.equal(resolve("active", { variant_id: 9999, product_name: "ReviewBridge Pro" }), null);
  assert.equal(resolve("expired", { variant_id: 9999 }), null);
  assert.equal(resolve("unknown"), null);
  assert.equal(resolve(undefined), null);
  assert.equal(resolve("active", {}, "order_created"), "unhandled");
});
test("pause policy follows complimentary access setting", () => {
  assert.equal(resolve("paused", { pause: { mode: "free" } }), "pro");
  assert.equal(resolve("paused", { pause: { mode: "void" } }), "free");
});
test("checkout account binding cannot be forged or transferred across mode/accounts", () => {
  const signature = checkoutBinding("a", "test", "secret");
  assert.equal(validCheckoutBinding("a", "test", signature, "secret"), true);
  assert.equal(validCheckoutBinding("b", "test", signature, "secret"), false);
  assert.equal(validCheckoutBinding("a", "live", signature, "secret"), false);
  assert.equal(validCheckoutBinding("a", "test", "x", "secret"), false);
});
test("provider data must match type, store, environment and valid dates", () => {
  const data = { id: "789", type: "subscriptions", attributes: { store_id: 321, test_mode: true, updated_at: "2026-10-20T00:00:00Z" } };
  assert.equal(validateSubscription(data, { LEMONSQUEEZY_STORE_ID: "321" }), null);
  assert.equal(validateSubscription(data, { LEMONSQUEEZY_STORE_ID: "321", BILLING_MODE: "live" }), "wrong_mode");
  assert.equal(validateSubscription(data, { LEMONSQUEEZY_STORE_ID: "999" }), "wrong_store");
  assert.equal(validateSubscription(data, {}), "not_configured");
  assert.equal(validateSubscription({ ...data, type: "orders" }, {}), "invalid_subscription");
});
