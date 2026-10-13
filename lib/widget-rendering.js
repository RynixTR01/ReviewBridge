import { createHash } from "node:crypto";

export function cleanReviewBody(body) {
  return body && body !== "null" && body !== '"null"'
    ? String(body).trim().replace(/^"+|"+$/g, "").trim()
    : null;
}

export function filterWidgetReviews(reviews, widget, { moderation = {}, canUseAdvancedFilters = false, canUseSmartFilter = false } = {}) {
  const includeTerms = canUseAdvancedFilters
    ? String(widget.include_keywords || "").split(",").map((term) => term.trim().toLocaleLowerCase()).filter(Boolean)
    : [];
  const excludeTerms = canUseAdvancedFilters
    ? String(widget.exclude_keywords || "").split(",").map((term) => term.trim().toLocaleLowerCase()).filter(Boolean)
    : [];
  const dateFrom = canUseAdvancedFilters && widget.date_from ? String(widget.date_from).slice(0, 10) : "";
  const dateTo = canUseAdvancedFilters && widget.date_to ? String(widget.date_to).slice(0, 10) : "";
  const minimumRating = canUseAdvancedFilters ? Number(widget.minimum_rating) || 1 : 1;
  const smartFilter = canUseSmartFilter && (widget.smart_filter === true || widget.smart_filter === "true");
  const maximum = Math.max(1, Math.min(Number(widget.max_reviews) || 5, 20));

  return [...(reviews || [])]
    .map((review) => ({ ...review, body: cleanReviewBody(review.body) }))
    .filter((review) => moderation[review.id] !== "hidden")
    .filter((review) => Number(review.rating) >= minimumRating)
    .filter((review) => !smartFilter || (review.body && review.body.length > 2))
    .filter((review) => {
      const parsed = review.reviewed_at ? new Date(review.reviewed_at) : null;
      const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
      return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
    })
    .filter((review) => !includeTerms.length || includeTerms.some((term) => (review.body || "").toLocaleLowerCase().includes(term)))
    .filter((review) => !excludeTerms.some((term) => (review.body || "").toLocaleLowerCase().includes(term)))
    .sort((a, b) => {
      const pinned = Number(moderation[b.id] === "pinned") - Number(moderation[a.id] === "pinned");
      if (pinned) return pinned;
      if (canUseAdvancedFilters && widget.sort_order === "highest") return Number(b.rating) - Number(a.rating);
      if (canUseAdvancedFilters && widget.sort_order === "lowest") return Number(a.rating) - Number(b.rating);
      return (new Date(b.reviewed_at || 0).getTime() || 0) - (new Date(a.reviewed_at || 0).getTime() || 0);
    })
    .slice(0, maximum);
}

export function safeWidgetColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function createWidgetEtag(body) {
  return `"${createHash("sha256").update(body).digest("base64url")}"`;
}

export function matchesWidgetEtag(header, etag) {
  if (!header) return false;
  return header.split(",").some((candidate) => {
    const normalized = candidate.trim();
    return normalized === "*" || normalized.replace(/^W\//, "") === etag;
  });
}

export function getWidgetColors(widget) {
  const themeBg = widget.theme === "dark" ? "#1f2937" : widget.theme === "minimal" ? "transparent" : "#ffffff";
  const themeText = widget.theme === "dark" ? "#f9fafb" : "#111827";
  return {
    background: safeWidgetColor(widget.background_color, themeBg),
    text: safeWidgetColor(widget.text_color, themeText),
    accent: safeWidgetColor(widget.accent_color, "#6366f1"),
    card: widget.theme === "dark" ? "#374151" : "#ffffff",
    border: widget.theme === "minimal" ? "none" : widget.theme === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb",
    shadow: widget.theme === "minimal" ? "none" : "0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06)",
  };
}

export function getWidgetLocale(setting, browserLanguage = "en") {
  if (setting === "tr" || setting === "en") return setting;
  return String(browserLanguage).toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function isAllowedWidgetDomain(request, allowedDomains = []) {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) return true;
  const referrer = request.headers.get("origin") || request.headers.get("referer");
  if (!referrer) return false;
  let hostname;
  try { hostname = new URL(referrer).hostname.toLowerCase(); }
  catch { return false; }
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}
