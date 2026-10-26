// Google and Trustpilot review text cannot be imported or re-hosted until the
// product has a verified right to use each provider's content. Keep the guard
// in server code; an environment variable must not silently reopen it.
export const PROVIDER_REVIEW_CONTENT_PAUSED = true;

export function isProviderReviewContentPaused(platform) {
  return PROVIDER_REVIEW_CONTENT_PAUSED && (platform === "google" || platform === "trustpilot");
}

export function providerReviewPauseMessage(locale = "tr") {
  return locale === "en"
    ? "Google and Trustpilot review imports are paused while content permissions are verified. Direct customer feedback remains available."
    : "Google ve Trustpilot yorum aktarımı içerik izinleri doğrulanana kadar duraklatıldı. Doğrudan müşteri geri bildirimi kullanılabilir.";
}
