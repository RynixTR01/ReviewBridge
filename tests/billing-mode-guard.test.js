import assert from "node:assert/strict";
import test from "node:test";
import { expireBillingForUser } from "../lib/billing-state.js";
import { effectivePlanSql } from "../lib/billing-entitlement.js";

test("billing expiry and public entitlement checks use the current provider mode", async () => {
  const previous = process.env.BILLING_MODE;
  const calls = [];
  const database = { query: async (statement, values) => { calls.push({ statement, values }); return []; } };
  try {
    process.env.BILLING_MODE = "live";
    await expireBillingForUser(database, "00000000-0000-0000-0000-000000000001");
    assert.deepEqual(calls[0].values, ["00000000-0000-0000-0000-000000000001", false]);
    assert.match(calls[0].statement, /billing_test_mode <> \$2::boolean/);
    assert.match(effectivePlanSql("owner"), /owner\.billing_test_mode <> FALSE/);

    process.env.BILLING_MODE = "test";
    await expireBillingForUser(database, "00000000-0000-0000-0000-000000000001");
    assert.equal(calls[1].values[1], true);
    assert.match(effectivePlanSql("owner"), /owner\.billing_test_mode <> TRUE/);
    assert.throws(() => effectivePlanSql("owner; DROP TABLE public.users"), TypeError);
  } finally {
    if (previous === undefined) delete process.env.BILLING_MODE;
    else process.env.BILLING_MODE = previous;
  }
});
