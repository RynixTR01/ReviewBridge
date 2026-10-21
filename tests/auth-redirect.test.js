import test from "node:test";
import assert from "node:assert/strict";
import { safeAuthNextPath } from "../lib/auth/redirect.js";

test("auth redirect preserves safe dashboard and invite destinations", () => {
  assert.equal(safeAuthNextPath("/dashboard"), "/dashboard");
  assert.equal(safeAuthNextPath("/account-deletion"), "/account-deletion");
  assert.equal(safeAuthNextPath("/dashboard/widget/abc-123?tab=reviews"), "/dashboard/widget/abc-123?tab=reviews");
  assert.equal(safeAuthNextPath(`/join/brand/${"a".repeat(48)}`), `/join/brand/${"a".repeat(48)}`);
});

test("auth redirect rejects external and unrelated destinations", () => {
  assert.equal(safeAuthNextPath("https://example.com"), "/dashboard");
  assert.equal(safeAuthNextPath("//example.com/dashboard"), "/dashboard");
  assert.equal(safeAuthNextPath("/login?next=/dashboard"), "/dashboard");
  assert.equal(safeAuthNextPath("/dashboard/../login"), "/dashboard");
});
