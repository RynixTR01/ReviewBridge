import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReviewRating } from "../lib/review-rating.js";

test("normalizes numeric provider ratings without changing them", () => {
  assert.equal(normalizeReviewRating(5), 5);
  assert.equal(normalizeReviewRating("4.5"), 4.5);
  assert.equal(normalizeReviewRating(" 3 "), 3);
});

test("missing and out-of-range ratings are rejected instead of becoming five stars", () => {
  for (const value of [undefined, null, "", 0, -1, 5.1, "unknown", Number.NaN]) {
    assert.equal(normalizeReviewRating(value), null);
  }
});
