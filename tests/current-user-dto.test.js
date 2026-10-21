import test from "node:test";
import assert from "node:assert/strict";
import { toApplicationUser } from "../lib/auth/user-dto.js";

test("application user DTO requires a verified email and profile", () => {
  assert.equal(toApplicationUser({ email: "user@example.com", emailVerified: false }, { id: "user-1" }), null);
  assert.equal(toApplicationUser({ email: "user@example.com", emailVerified: true }, null), null);
});

test("application user DTO exposes only fields needed by the app", () => {
  const user = toApplicationUser({
    id: "auth-id",
    email: "user@example.com",
    emailVerified: true,
    name: "Provider Name",
    accessToken: "must-not-leak",
    refreshToken: "must-not-leak",
  }, { id: "app-id", email: "user@example.com", full_name: null, plan: "pro" });

  assert.deepEqual(user, { id: "app-id", email: "user@example.com", name: "Provider Name", plan: "pro" });
});
