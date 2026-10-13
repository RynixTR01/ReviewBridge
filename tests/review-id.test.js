import test from "node:test";
import assert from "node:assert/strict";
import { createStableReviewId } from "../lib/review-id.js";

test("provider review IDs remain stable across mapping field names", () => {
  assert.equal(createStableReviewId("google", { review_id: "abc-123" }), "provider:abc-123");
  assert.equal(createStableReviewId("google", { id: "abc-123" }), "provider:abc-123");
});

test("reviews without provider IDs receive a stable normalized content hash", () => {
  const first = { reviewer_name: "  Jane   Doe ", rating: 5, body: " Great   service ", reviewed_at: "2026-10-01T12:30:00Z" };
  const retry = { reviewer_name: "jane doe", rating: "5", body: "great service", reviewed_at: "2026-10-01T23:59:00Z" };
  assert.equal(createStableReviewId("google", first), createStableReviewId("google", retry));
  assert.match(createStableReviewId("google", first), /^content:[a-f0-9]{64}$/);
});

test("estimated fetch dates do not make fallback review IDs change between sync days", () => {
  const base = { reviewer_name: "A", rating: 4, body: "Same words" };
  assert.equal(
    createStableReviewId("trustpilot", { ...base, reviewed_at: "2026-10-01", review_date_estimated: true }),
    createStableReviewId("trustpilot", { ...base, reviewed_at: "2026-10-02", review_date_estimated: true }),
  );
});
