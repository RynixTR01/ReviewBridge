import { createHash } from "node:crypto";

export function createStableReviewId(platform, review = {}) {
  const providerId = review.review_id ?? review.reviewId ?? review.id;
  if (providerId !== null && providerId !== undefined && String(providerId).trim()) {
    return `provider:${String(providerId).trim().slice(0, 240)}`;
  }

  const normalized = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const reviewedDate = review.reviewed_at ? new Date(review.reviewed_at) : null;
  const dateKey = !review.review_date_estimated && reviewedDate && !Number.isNaN(reviewedDate.getTime())
    ? reviewedDate.toISOString().slice(0, 10)
    : "";
  const signature = [
    normalized(platform),
    normalized(review.reviewer_name),
    String(Number(review.rating) || 0),
    normalized(review.body),
    dateKey,
  ].join("|");
  const hash = createHash("sha256").update(signature).digest("hex");
  return `content:${hash}`;
}
