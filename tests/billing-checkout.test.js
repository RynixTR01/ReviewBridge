import test from "node:test";
import assert from "node:assert/strict";
import { checkoutCacheKey, getOrCreateBoundCheckout } from "../lib/billing-checkout.js";

const env = {
  BILLING_MODE: "test", LEMONSQUEEZY_STORE_ID: "321",
  LEMONSQUEEZY_PRO_VARIANT_ID: "123", LEMONSQUEEZY_AGENCY_VARIANT_ID: "456",
  LEMONSQUEEZY_WEBHOOK_SECRET: "test-only-secret", NEXT_PUBLIC_APP_URL: "https://app.test",
};
const user = { id: "user-a", email: "a@example.test" };
const checkoutUrl = "https://shop.lemonsqueezy.com/checkout/custom/new";

test("checkout cache changes with mode, store, variant, signing secret and return site", () => {
  const key = checkoutCacheKey("pro", env);
  assert.equal(key, checkoutCacheKey("pro", { ...env }));
  assert.notEqual(key, checkoutCacheKey("agency", env));
  for (const change of [
    { BILLING_MODE: "live" }, { LEMONSQUEEZY_STORE_ID: "654" },
    { LEMONSQUEEZY_PRO_VARIANT_ID: "789" }, { LEMONSQUEEZY_WEBHOOK_SECRET: "rotated" },
    { NEXT_PUBLIC_APP_URL: "https://new.test" },
  ]) assert.notEqual(key, checkoutCacheKey("pro", { ...env, ...change }));
  assert.ok(!key.includes(env.LEMONSQUEEZY_WEBHOOK_SECRET));
  assert.throws(() => checkoutCacheKey("free", env), { code: "not_configured" });
});

test("live checkout replaces cached test checkout without a subscription mode marker", async () => {
  // A user who opened checkout but never paid has billing_test_mode = null.
  const live = { ...env, BILLING_MODE: "live" };
  const oldRow = { billing_test_mode: null, billing_checkout_plan: checkoutCacheKey("pro", env) };
  let calls = 0;
  const result = await getOrCreateBoundCheckout(user, "pro", {
    env: live,
    queryOne: async (sql, args) => {
      calls++;
      if (calls === 1) {
        assert.match(sql, /billing_checkout_claim IS NULL AND billing_checkout_plan IS DISTINCT FROM \$3/);
        assert.ok(!sql.includes("billing_test_mode"));
        assert.equal(args[0], user.id);
        assert.equal(args[2], checkoutCacheKey("pro", live));
        assert.notEqual(args[2], oldRow.billing_checkout_plan);
      } else {
        assert.match(sql, /billing_checkout_claim=\$2/);
        assert.equal(args[2], checkoutUrl);
      }
      return { id: user.id };
    },
    billingApi: { createCheckout: async (input) => {
      assert.deepEqual(input, { userId: user.id, email: user.email, plan: "pro", returnUrl: "https://app.test/dashboard/upgrade?billing=return" });
      return checkoutUrl;
    } },
  });
  assert.equal(result, checkoutUrl);
  assert.equal(calls, 2);
});

test("only a matching completed checkout is reused without a new provider request", async () => {
  let calls = 0;
  const key = checkoutCacheKey("pro", env);
  assert.equal(await getOrCreateBoundCheckout(user, "pro", {
    env,
    queryOne: async (sql, args) => {
      if (++calls === 1) return null;
      assert.match(sql, /billing_checkout_plan=\$2/);
      assert.match(sql, /billing_checkout_claim IS NULL/);
      assert.deepEqual(args, [user.id, key]);
      return { billing_checkout_plan: key, billing_checkout_url: checkoutUrl };
    },
    billingApi: { createCheckout: () => assert.fail("must reuse the matching checkout") },
  }), checkoutUrl);
});

test("legacy, different-mode and untrusted cached links cannot be returned", async () => {
  for (const row of [
    null,
    { billing_checkout_plan: "pro", billing_checkout_url: checkoutUrl },
    { billing_checkout_plan: checkoutCacheKey("pro", { ...env, BILLING_MODE: "live" }), billing_checkout_url: checkoutUrl },
    { billing_checkout_plan: checkoutCacheKey("pro", env), billing_checkout_url: "https://attacker.test" },
  ]) {
    let calls = 0;
    await assert.rejects(() => getOrCreateBoundCheckout(user, "pro", {
      env, queryOne: async () => ++calls === 1 ? null : row,
      billingApi: { createCheckout: () => assert.fail("an active claim must not start another checkout") },
    }), { code: "checkout_pending" });
  }
});

test("failed provider request releases only its own claim and permits retry", async () => {
  let claim;
  let calls = 0;
  const unavailable = new Error("provider_unavailable");
  await assert.rejects(() => getOrCreateBoundCheckout(user, "pro", {
    env,
    queryOne: async (sql, args) => {
      if (++calls === 1) claim = args[1];
      else {
        assert.match(sql, /billing_checkout_claim=\$2/);
        assert.match(sql, /billing_checkout_expires_at=NULL/);
        assert.deepEqual(args, [user.id, claim]);
      }
      return { id: user.id };
    },
    billingApi: { createCheckout: async () => { throw unavailable; } },
  }), unavailable);
  assert.equal(calls, 2);
});

test("a lost claim or completed subscription prevents returning an unsaved checkout", async () => {
  let calls = 0;
  await assert.rejects(() => getOrCreateBoundCheckout(user, "pro", {
    env, queryOne: async () => ++calls === 1 ? { id: user.id } : null,
    billingApi: { createCheckout: async () => checkoutUrl },
  }), { code: "checkout_pending" });
  assert.equal(calls, 3);
});
