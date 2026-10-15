import test from "node:test";
import assert from "node:assert/strict";
import { recipientFingerprint } from "../lib/privacy-fingerprint.js";

test("recipient fingerprints are stable, normalized, and scoped", () => {
  const previous = process.env.NEON_AUTH_COOKIE_SECRET;
  process.env.NEON_AUTH_COOKIE_SECRET = "test-only-secret";
  try {
    const first = recipientFingerprint("owner-a", " Person@Example.com ");
    assert.equal(first, recipientFingerprint("owner-a", "person@example.com"));
    assert.notEqual(first, recipientFingerprint("owner-b", "person@example.com"));
    assert.match(first, /^[a-f0-9]{64}$/);
  } finally {
    if (previous === undefined) delete process.env.NEON_AUTH_COOKIE_SECRET;
    else process.env.NEON_AUTH_COOKIE_SECRET = previous;
  }
});
