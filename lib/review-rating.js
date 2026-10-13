export function normalizeReviewRating(value) {
  const rating = typeof value === "number" || typeof value === "string" && value.trim()
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}
