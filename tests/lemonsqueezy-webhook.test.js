import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
} from "../lib/lemonsqueezy-webhook.js";

const secret = "test-webhook-secret";
const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

test("accepts a valid Lemon Squeezy HMAC signature", () => {
  assert.equal(verifyLemonSqueezySignature(body, signature, secret), true);
});

test("rejects a missing secret, malformed signature, or modified body", () => {
  assert.equal(verifyLemonSqueezySignature(body, signature, ""), false);
  assert.equal(verifyLemonSqueezySignature(body, "not-a-signature", secret), false);
  assert.equal(verifyLemonSqueezySignature(body + " ", signature, secret), false);
});

test("maps only known product names to paid plans", () => {
  assert.equal(resolveLemonSqueezyPlan("subscription_created", { variant_name: "ReviewBridge Pro" }), "pro");
  assert.equal(resolveLemonSqueezyPlan("subscription_updated", { product_name: "ReviewBridge Agency" }), "agency");
  assert.equal(resolveLemonSqueezyPlan("subscription_created", { variant_name: "Unknown product" }), null);
});

test("configured variant IDs are matched exactly and unknown variants fail closed", () => {
  const ids = { pro: "12345", agency: "67890" };
  assert.equal(resolveLemonSqueezyPlan("subscription_created", { variant_id: 12345, product_name: "Unrelated" }, ids), "pro");
  assert.equal(resolveLemonSqueezyPlan("subscription_created", { variant_id: "67890" }, ids), "agency");
  assert.equal(resolveLemonSqueezyPlan("subscription_created", { variant_id: "99999", variant_name: "Pro" }, ids), null);
});

test("handles cancellation and expiration without treating them as purchases", () => {
  assert.equal(resolveLemonSqueezyPlan("subscription_cancelled"), "unchanged");
  assert.equal(resolveLemonSqueezyPlan("subscription_expired"), "free");
  assert.equal(resolveLemonSqueezyPlan("order_created"), "unhandled");
});
