export function filterWidgetPreviewReviews(reviews, {
  moderation = {},
  minimumRating = 1,
  canFilterRating = true,
  smartFilter = false,
  canSelectTheme = false,
  dateFrom = "",
  dateTo = "",
  includeKeywords = "",
  excludeKeywords = "",
  canUseAdvancedFilters = false,
  sortOrder = "newest",
  maxReviews = 5,
} = {}) {
  const includeTerms = canUseAdvancedFilters
    ? String(includeKeywords).split(",").map((term) => term.trim().toLocaleLowerCase()).filter(Boolean)
    : [];
  const excludeTerms = canUseAdvancedFilters
    ? String(excludeKeywords).split(",").map((term) => term.trim().toLocaleLowerCase()).filter(Boolean)
    : [];

  return [...(reviews || [])]
    .filter((review) => moderation[review.id] !== "hidden")
    .filter((review) => !canFilterRating || Number(review.rating) >= Number(minimumRating || 1))
    .filter((review) => !smartFilter || !canSelectTheme || (review.body && review.body.trim() !== ""))
    .filter((review) => !canUseAdvancedFilters || !dateFrom || String(review.reviewed_at).slice(0, 10) >= dateFrom)
    .filter((review) => !canUseAdvancedFilters || !dateTo || String(review.reviewed_at).slice(0, 10) <= dateTo)
    .filter((review) => !includeTerms.length || includeTerms.some((term) => (review.body || "").toLocaleLowerCase().includes(term)))
    .filter((review) => !excludeTerms.some((term) => (review.body || "").toLocaleLowerCase().includes(term)))
    .sort((a, b) => {
      const pinned = Number(moderation[b.id] === "pinned") - Number(moderation[a.id] === "pinned");
      if (pinned) return pinned;
      if (canUseAdvancedFilters && sortOrder === "highest") return Number(b.rating) - Number(a.rating);
      if (canUseAdvancedFilters && sortOrder === "lowest") return Number(a.rating) - Number(b.rating);
      return new Date(b.reviewed_at || 0).getTime() - new Date(a.reviewed_at || 0).getTime();
    })
    .slice(0, Math.max(1, Number(maxReviews) || 5));
}
