import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../lib/rate-limit-core.js";

const env = { DATABASE_URL: "test", CRON_SECRET: "test-secret" };
const request = (ip) => new Request("https://app.test", { headers: { "x-real-ip": ip } });
function sharedDatabase() {
  const counts = new Map();
  return async (_sql, [hash, window]) => {
    const key = `${hash}:${window}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    return { request_count: counts.get(key) };
  };
}
test("account allowance survives changing IP and server instances; other accounts are independent", async () => {
  const queryOne = sharedDatabase();
  const first = createRateLimiter({ queryOne, env, now: () => 1000 });
  const second = createRateLimiter({ queryOne, env, now: () => 1000 });
  const options = { limit: 1, scope: "account", failClosed: true };
  assert.equal(await first(request("1.1.1.1"), "ai:user-a", options), false);
  assert.equal(await second(request("2.2.2.2"), "ai:user-a", options), true);
  assert.equal(await second(request("2.2.2.2"), "ai:user-b", options), false);
});
test("paid calls stop on unavailable shared storage, missing configuration or malformed result", async () => {
  for (const [config, queryOne] of [
    [env, async () => { throw new Error("offline"); }],
    [{}, async () => ({ request_count: 1 })],
    [env, async () => null],
  ]) {
    const limiter = createRateLimiter({ env: config, queryOne });
    assert.equal(await limiter(request("1"), "ai:a", { failClosed: true, scope: "account" }), true);
  }
});
test("IP limits keep anonymous visitors independent and reset in the next window", async () => {
  let time = 1000;
  const limiter = createRateLimiter({ env, queryOne: sharedDatabase(), now: () => time });
  assert.equal(await limiter(request("1"), "widget", { limit: 1 }), false);
  assert.equal(await limiter(request("2"), "widget", { limit: 1 }), false);
  assert.equal(await limiter(request("1"), "widget", { limit: 1 }), true);
  time = 61000;
  assert.equal(await limiter(request("1"), "widget", { limit: 1 }), false);
});
