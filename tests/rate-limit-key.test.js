import test from "node:test";
import assert from "node:assert/strict";
import { rateLimitBucketHash } from "../lib/rate-limit-key.js";

test("rate limit identity is stable, scoped, and does not expose raw client data", () => {
  const first = rateLimitBucketHash("203.0.113.9", "widget:secret-token", "stable-secret");
  assert.equal(first, rateLimitBucketHash("203.0.113.9", "widget:secret-token", "stable-secret"));
  assert.notEqual(first, rateLimitBucketHash("203.0.113.10", "widget:secret-token", "stable-secret"));
  assert.notEqual(first, rateLimitBucketHash("203.0.113.9", "widget:other-token", "stable-secret"));
  assert.notEqual(first, rateLimitBucketHash("203.0.113.9", "widget:secret-token", "other-secret"));
  assert.equal(first.includes("203.0.113.9"), false);
  assert.equal(first.includes("secret-token"), false);
});
