import test from "node:test";
import assert from "node:assert/strict";
import { isValidApifyWebhookSecret } from "../lib/apify-webhook-auth.js";

test("accepts an exact Apify webhook secret", () => {
  assert.equal(isValidApifyWebhookSecret("expected-secret", "expected-secret"), true);
});

test("rejects missing, empty, unequal, and malformed Apify webhook secrets", () => {
  assert.equal(isValidApifyWebhookSecret(undefined, "expected-secret"), false);
  assert.equal(isValidApifyWebhookSecret("expected-secret", undefined), false);
  assert.equal(isValidApifyWebhookSecret("", ""), false);
  assert.equal(isValidApifyWebhookSecret("wrong", "expected-secret"), false);
});
