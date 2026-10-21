import test from "node:test";
import assert from "node:assert/strict";
import { createBillingApi, safeBillingUrl } from "../lib/billing-api.js";
import { validCheckoutBinding } from "../lib/billing-state.js";

const env = {
  LEMONSQUEEZY_API_KEY: "not-a-real-key", LEMONSQUEEZY_STORE_ID: "321",
  LEMONSQUEEZY_PRO_VARIANT_ID: "12345", LEMONSQUEEZY_AGENCY_VARIANT_ID: "67890",
  LEMONSQUEEZY_WEBHOOK_SECRET: "test-secret", BILLING_MODE: "test",
};
test("server checkout restricts variants, binds authenticated account, and remains test-only", async () => {
  let sent;
  const api = createBillingApi({ env, fetchImpl: async (url, options) => {
    assert.equal(url, "https://api.lemonsqueezy.com/v1/checkouts");
    assert.equal(options.headers.Authorization, "Bearer not-a-real-key");
    assert.equal(options.redirect, "error");
    sent = JSON.parse(options.body).data;
    return Response.json({ data: { type: "checkouts", attributes: { url: "https://shop.lemonsqueezy.com/checkout/custom/test", test_mode: true } } });
  } });
  await api.createCheckout({ userId: "user-a", email: "a@example.test", plan: "pro", returnUrl: "https://app.test/dashboard" });
  assert.deepEqual(sent.attributes.product_options.enabled_variants, [12345]);
  assert.equal(sent.attributes.test_mode, true);
  assert.equal(sent.relationships.store.data.id, "321");
  assert.equal(validCheckoutBinding("user-a", "test", sent.attributes.checkout_data.custom.binding, env.LEMONSQUEEZY_WEBHOOK_SECRET), true);
});
test("provider redirect URLs must be HTTPS on the real Lemon domain", () => {
  for (const value of ["https://lemonsqueezy.com.attacker.test", "https://fakelemonsqueezy.com", "http://shop.lemonsqueezy.com", "javascript:alert(1)", "https://user:password@shop.lemonsqueezy.com"]) {
    assert.equal(safeBillingUrl(value), null);
  }
  assert.equal(safeBillingUrl("https://shop.lemonsqueezy.com/billing"), "https://shop.lemonsqueezy.com/billing");
});
test("subscription retrieval rejects another store or mode instead of trusting provider payload shape", async () => {
  const api = createBillingApi({ env, fetchImpl: async () => Response.json({ data: {
    id: "789", type: "subscriptions", attributes: { store_id: 999, test_mode: true, updated_at: "2026-10-20T00:00:00Z" },
  } }) });
  await assert.rejects(() => api.getSubscription("789"), { code: "invalid_subscription" });
  await assert.rejects(() => api.getSubscription("../stores"), { code: "invalid_subscription" });
});
test("account deletion cannot assume cancellation succeeded when provider still reports active", async () => {
  const api = createBillingApi({ env, fetchImpl: async (_url, options) => {
    assert.equal(options.method, "DELETE");
    return Response.json({ data: { type: "subscriptions", id: "789", attributes: {
      store_id: 321, test_mode: true, updated_at: "2026-10-20T00:00:00Z", status: "active",
    } } });
  } });
  await assert.rejects(() => api.cancelSubscription("789"), { code: "cancellation_unconfirmed" });
});
test("provider errors never copy sensitive response bodies into application errors", async () => {
  const api = createBillingApi({ env, fetchImpl: async () => new Response("private data", { status: 500 }) });
  await assert.rejects(() => api.getSubscription("789"), { message: "provider_unavailable" });
});
