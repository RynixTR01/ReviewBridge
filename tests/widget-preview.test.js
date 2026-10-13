import test from "node:test";
import assert from "node:assert/strict";
import { filterWidgetPreviewReviews } from "../lib/widget-preview.js";

const reviews = [
  { id: "five", rating: 5, body: "Excellent", reviewed_at: "2026-03-03T00:00:00Z" },
  { id: "four", rating: 4, body: "Good", reviewed_at: "2026-03-02T00:00:00Z" },
  { id: "three", rating: 3, body: "Okay", reviewed_at: "2026-03-01T00:00:00Z" },
];

test("changing the minimum rating immediately changes the customize preview", () => {
  const fiveStar = filterWidgetPreviewReviews(reviews, { minimumRating: 5, canFilterRating: true, maxReviews: 10 });
  const fourPlus = filterWidgetPreviewReviews(reviews, { minimumRating: 4, canFilterRating: true, maxReviews: 10 });

  assert.deepEqual(fiveStar.map((review) => review.id), ["five"]);
  assert.deepEqual(fourPlus.map((review) => review.id), ["five", "four"]);
});

test("free preview applies rating selection and ignores Pro-only keyword filters", () => {
  const result = filterWidgetPreviewReviews(reviews, {
    minimumRating: 4,
    canFilterRating: true,
    includeKeywords: "missing",
    canUseAdvancedFilters: false,
    maxReviews: 10,
  });

  assert.deepEqual(result.map((review) => review.id), ["five", "four"]);
});
