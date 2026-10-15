export const CONNECTED_REVIEW_SOURCES = Object.freeze([
  { id: "google", name: "Google Maps", mode: "connected" },
  { id: "trustpilot", name: "Trustpilot", mode: "connected" },
]);

export const PENDING_REVIEW_SOURCES = Object.freeze([
  { id: "facebook", name: "Facebook" },
  { id: "yelp", name: "Yelp" },
  { id: "tripadvisor", name: "Tripadvisor" },
  { id: "g2", name: "G2" },
  { id: "capterra", name: "Capterra" },
]);

export function isConnectedReviewSource(sourceId) {
  return CONNECTED_REVIEW_SOURCES.some((source) => source.id === sourceId);
}
