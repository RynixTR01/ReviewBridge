import assert from "node:assert/strict";
import test from "node:test";
import { isSupportAdmin, normalizeSupportTicket } from "../lib/support-tickets.js";

test("contact input rejects malformed or oversized fields before reaching storage", () => {
  const valid = new FormData();
  valid.set("email", " Customer@Example.com ");
  valid.set("subject", "Missing reviews");
  valid.set("message", "My latest reviews do not appear in the widget.");
  assert.deepEqual(normalizeSupportTicket(valid), {
    email: "customer@example.com", subject: "Missing reviews",
    message: "My latest reviews do not appear in the widget.",
  });

  valid.set("message", "x".repeat(4001));
  assert.equal(normalizeSupportTicket(valid).error, "message");
  valid.set("message", "My latest reviews do not appear in the widget.");
  valid.set("website", "https://spam.invalid");
  assert.equal(normalizeSupportTicket(valid).error, "spam");
});

test("support inbox is limited to the owner's verified account", () => {
  assert.equal(isSupportAdmin(null), false);
  assert.equal(isSupportAdmin({ email: "other@example.com" }), false);
  assert.equal(isSupportAdmin({ email: "SEMIHAYAN01@HOTMAIL.COM" }), true);
});
