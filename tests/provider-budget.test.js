import assert from "node:assert/strict";
import test from "node:test";
import { checkAiDailyLimit, checkProviderAttemptLimit, configuredDailyLimit } from "../lib/provider-budget-core.js";

test("different accounts share one fail-closed daily Apify budget", async () => {
  const seen = [];
  const limiter = async (_request, key, options) => {
    seen.push({ key, options });
    return key === "provider-attempt:sitewide";
  };
  assert.equal(await checkProviderAttemptLimit(limiter, "user-a", "free", 100), "site");
  assert.equal(await checkProviderAttemptLimit(limiter, "user-b", "agency", 100), "site");
  assert.equal(seen[0].key, "provider-attempt:user-a");
  assert.equal(seen[2].key, "provider-attempt:user-b");
  assert.equal(seen[1].key, seen[3].key);
  assert.equal(seen[1].options.windowMs, 86_400_000);
  assert.equal(seen[1].options.scope, "account");
  assert.equal(seen[1].options.failClosed, true);
});

test("account cap stops before consuming the site-wide budget", async () => {
  const seen = [];
  const limiter = async (_request, key) => { seen.push(key); return true; };
  assert.equal(await checkProviderAttemptLimit(limiter, "user-a", "pro", 100), "account");
  assert.deepEqual(seen, ["provider-attempt:user-a"]);
});

test("AI daily budget uses one shared key and invalid overrides keep safe defaults", async () => {
  const seen = [];
  await checkAiDailyLimit(async (_request, key, options) => {
    seen.push({ key, options }); return false;
  }, 100);
  assert.equal(seen[0].key, "ai-review-insights:sitewide");
  assert.equal(seen[0].options.windowMs, 86_400_000);
  assert.equal(seen[0].options.failClosed, true);
  assert.equal(configuredDailyLimit("0", 100), 100);
  assert.equal(configuredDailyLimit("999999", 100), 100);
  assert.equal(configuredDailyLimit("25", 100), 25);
});
