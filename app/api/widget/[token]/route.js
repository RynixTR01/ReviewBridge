import { buildGoogleReviewUrl } from "@/app/lib/googleReviewUrl";
import { query, queryOne } from "@/lib/db";
import { normalizeWidgetSettings, PLAN_LIMITS } from "@/lib/plans";
import { createWidgetEtag, filterWidgetReviews, getWidgetColors, isAllowedWidgetDomain, matchesWidgetEtag } from "@/lib/widget-rendering";
import { buildWidgetEmbedScript } from "@/lib/widget-embed-script";
import { isRateLimited } from "@/lib/rate-limit";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

const safeExternalUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

function stars(rating, accent) {
  return `<span role="img" aria-label="${escapeHtml(rating)} out of 5 stars" style="color:${accent};letter-spacing:2px">${"★".repeat(Math.max(0, Math.min(5, Number(rating) || 0)))}${"☆".repeat(5 - Math.max(0, Math.min(5, Number(rating) || 0)))}</span>`;
}

export async function GET(_request, { params }) {
  const { token } = await params;
  if (!token || !/^[a-zA-Z0-9_-]{12,128}$/.test(token)) {
    return new Response("console.error('ReviewBridge: Invalid widget token');", { status: 400, headers: { "Content-Type": "application/javascript; charset=utf-8" } });
  }
  if (await isRateLimited(_request, `widget:${token}`)) {
    return new Response("console.warn('ReviewBridge: Request limit exceeded');", {
      status: 429,
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Retry-After": "60" },
    });
  }

  const widget = await queryOne(
    `SELECT w.*, u.plan AS user_plan, s.business_name, s.platform AS source_platform,
            s.place_id AS source_place_id, s.last_synced_at, s.sync_status
     FROM public.widgets w
     JOIN public.users u ON u.id = w.user_id
     JOIN public.sources s ON s.id = w.source_id
     WHERE w.embed_token = $1`,
    [token],
  );
  if (!widget) {
    return new Response("console.error('ReviewBridge: Widget not found');", { status: 404, headers: { "Content-Type": "application/javascript; charset=utf-8" } });
  }
  if (!isAllowedWidgetDomain(_request, widget.allowed_domains)) {
    return new Response("console.error('ReviewBridge: This domain is not allowed for the widget');", {
      status: 403,
      headers: { "Content-Type": "application/javascript; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  }

  const plan = PLAN_LIMITS[widget.user_plan] ? widget.user_plan : "free";
  const limits = PLAN_LIMITS[plan];
  const safeSettings = normalizeWidgetSettings({
    theme: widget.theme,
    maxReviews: widget.max_reviews,
    showBadge: widget.show_badge,
    smartFilter: widget.smart_filter,
    showReviewButton: widget.show_review_button,
    layout: widget.layout,
    minimumRating: widget.minimum_rating,
    sortOrder: widget.sort_order,
    includeKeywords: widget.include_keywords,
    excludeKeywords: widget.exclude_keywords,
    dateFrom: widget.date_from ? String(widget.date_from).slice(0, 10) : "",
    dateTo: widget.date_to ? String(widget.date_to).slice(0, 10) : "",
    widgetLocale: widget.widget_locale,
    widgetTitle: widget.widget_title,
    backgroundColor: widget.background_color,
    textColor: widget.text_color,
    accentColor: widget.accent_color,
    showReviewerAvatar: widget.show_reviewer_avatar,
    showReviewedDate: widget.show_reviewed_date,
    showRatingSummary: widget.show_rating_summary, fontFamily: widget.font_family,
    cardDensity: widget.card_density, cornerStyle: widget.corner_style,
    allowedDomains: Array.isArray(widget.allowed_domains) ? widget.allowed_domains.join(",") : "",
  }, plan);
  Object.assign(widget, safeSettings, {
    max_reviews: safeSettings.maxReviews,
    minimum_rating: safeSettings.minimumRating,
    sort_order: safeSettings.sortOrder,
    include_keywords: safeSettings.includeKeywords,
    exclude_keywords: safeSettings.excludeKeywords,
    date_from: safeSettings.dateFrom,
    date_to: safeSettings.dateTo,
    widget_locale: safeSettings.widgetLocale,
    widget_title: safeSettings.widgetTitle,
    background_color: safeSettings.backgroundColor,
    text_color: safeSettings.textColor,
    accent_color: safeSettings.accentColor,
    show_reviewer_avatar: safeSettings.showReviewerAvatar,
    show_reviewed_date: safeSettings.showReviewedDate,
    show_rating_summary: safeSettings.showRatingSummary, font_family: safeSettings.fontFamily,
    card_density: safeSettings.cardDensity, corner_style: safeSettings.cornerStyle,
    allowed_domains: safeSettings.allowedDomains,
    show_badge: safeSettings.showBadge,
    smart_filter: safeSettings.smartFilter,
    show_review_button: safeSettings.showReviewButton,
  });
  const reviewLimit = Math.min(Math.max(1, Number(widget.max_reviews) || 5), limits.maxReviews);
  const fetchedReviews = await query(
    `SELECT id, reviewer_name, rating, body, reviewed_at
     FROM public.reviews WHERE source_id = $1
     ORDER BY reviewed_at DESC LIMIT 500`,
    [widget.source_id],
  );
  const preferenceRows = limits.canModerateReviews
    ? await query("SELECT review_id, state FROM public.widget_review_preferences WHERE widget_id = $1", [widget.id])
    : [];
  const moderation = Object.fromEntries((preferenceRows || []).map((item) => [item.review_id, item.state]));
  const widgetReviews = filterWidgetReviews(fetchedReviews, { ...widget, max_reviews: reviewLimit }, {
    moderation,
    canUseAdvancedFilters: limits.canUseAdvancedFilters,
    canFilterRating: limits.canFilterRating,
    canUseSmartFilter: limits.canSelectTheme,
  });

  const colors = getWidgetColors(widget);
  const layout = limits.canChooseLayout && ["grid", "carousel", "masonry", "floating"].includes(widget.layout) ? widget.layout : "list";
  const fontFamily = widget.font_family === "arial" ? "Arial, sans-serif" : widget.font_family === "georgia" ? "Georgia, serif" : "system-ui,sans-serif";
  const cardPadding = widget.card_density === "compact" ? 10 : 16;
  const cardRadius = { small: 6, medium: 12, large: 20 }[widget.corner_style] || 12;
  const averageRating = widgetReviews.length
    ? (widgetReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / widgetReviews.length).toFixed(1)
    : "0.0";
  const title = escapeHtml(widget.widget_title || "");
  const business = escapeHtml(widget.business_name || "");
  const platform = widget.source_platform === "google" ? "Google" : widget.source_platform === "trustpilot" ? "Trustpilot" : "Direct feedback";
  const platformSafe = escapeHtml(platform);
  const sourceUrl = safeExternalUrl(widget.source_maps_url);
  const lastSyncDate = widget.last_synced_at ? new Date(widget.last_synced_at) : null;
  const lastSyncIso = lastSyncDate && !Number.isNaN(lastSyncDate.getTime()) ? lastSyncDate.toISOString() : "";
  const isStale = widget.source_platform !== "first_party" && (!lastSyncIso || Date.now() - new Date(lastSyncIso).getTime() > 7 * 24 * 60 * 60 * 1000);
  let reviewUrl = null;
  if (widget.show_review_button && widget.source_platform === "google") {
    reviewUrl = buildGoogleReviewUrl(widget.source_place_id || widget.source_maps_url);
  } else if (widget.show_review_button && widget.source_platform === "trustpilot" && /^[a-zA-Z0-9.-]+$/.test(widget.source_place_id || "")) {
    reviewUrl = `https://www.trustpilot.com/review/${encodeURIComponent(widget.source_place_id)}#writeareview`;
  } else if (widget.show_review_button && widget.source_platform === "first_party" && /^[a-f0-9]{48}$/.test(widget.source_place_id || "")) {
    reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app"}/collect/${widget.source_place_id}`;
  }

  const cardHtml = widgetReviews.map((review) => {
    const reviewer = escapeHtml(review.reviewer_name || "A");
    const body = escapeHtml(review.body || "");
    const parsedReviewDate = review.reviewed_at ? new Date(review.reviewed_at) : null;
    const date = parsedReviewDate && !Number.isNaN(parsedReviewDate.getTime()) ? parsedReviewDate.toISOString() : "";
    const avatar = widget.show_reviewer_avatar !== false
      ? `<span aria-hidden="true" style="width:36px;height:36px;flex:0 0 36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${colors.accent}22;color:${colors.accent};font-weight:700">${escapeHtml(reviewer.slice(0, 1).toLocaleUpperCase())}</span>`
      : "";
    const dateLine = widget.show_reviewed_date !== false && date
      ? `<time class="rb-date" datetime="${escapeHtml(date)}" style="display:block;margin-top:8px;font-size:12px;opacity:.65" data-date="${escapeHtml(date)}"></time>`
      : "";
    return `<article role="listitem" class="rb-card" style="min-width:0;box-sizing:border-box;background:${colors.card};border:${colors.border};border-radius:${cardRadius}px;padding:${cardPadding}px;box-shadow:${colors.shadow};font-family:${fontFamily};color:${colors.text}"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${avatar}<div><div style="font-size:14px;font-weight:600">${reviewer}</div><div style="font-size:15px">${stars(review.rating, colors.accent)}</div></div></div>${body ? `<p class="rb-review-body" style="font-size:14px;line-height:1.55;opacity:.92;margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${body}</p>` : ""}${dateLine}</article>`;
  }).join("");

  const buttonHref = reviewUrl ? escapeHtml(reviewUrl) : "";
  const sourceHref = sourceUrl ? escapeHtml(sourceUrl) : "";
  const htmlByLocale = {};
  for (const locale of ["tr", "en"]) {
    const tr = locale === "tr";
    const emptyText = tr ? "Henüz gösterilecek yorum yok." : "No reviews to display yet.";
    const reviewLabel = widget.source_platform === "google"
      ? (tr ? "Google'da yorum bırak" : "Leave a review on Google")
      : widget.source_platform === "trustpilot"
      ? (tr ? "Trustpilot'ta yorum bırak" : "Leave a review on Trustpilot")
      : (tr ? "Geri bildirim bırak" : "Leave feedback");
    const attribution = widget.source_platform === "first_party"
      ? (tr ? "Doğrudan müşteri geri bildirimi" : "Direct customer feedback")
      : tr ? `${platformSafe} yorumları` : `${platformSafe} reviews`;
    const stale = widget.sync_status === "error" || isStale
      ? `<p style="font:12px system-ui,sans-serif;color:#b45309;text-align:center;margin:10px 0">${widget.sync_status === "error" ? (tr ? "Yorum kaynağı son eşitlemede güncellenemedi." : "The review source could not be refreshed during the last sync.") : (tr ? "Yorum verileri 7 günden eski olabilir." : "Review data may be more than 7 days old.")}</p>`
      : "";
    const content = widgetReviews.length ? cardHtml : `<p style="text-align:center;opacity:.65;font:14px system-ui,sans-serif">${emptyText}</p>`;
    const heading = title ? `<h2 style="font:600 18px/1.35 system-ui,sans-serif;color:${colors.text};margin:0 0 14px">${title}</h2>` : "";
    const syncLabel = tr ? "Son güncelleme" : "Last updated";
    const syncedAt = widget.source_platform !== "first_party" && lastSyncIso ? ` · ${syncLabel}: <time class="rb-date" datetime="${escapeHtml(lastSyncIso)}" data-date="${escapeHtml(lastSyncIso)}"></time>` : "";
    const sourceAttribution = `<div style="font:12px system-ui,sans-serif;text-align:center;opacity:.65;margin-top:12px;color:${colors.text}">${sourceHref ? `<a data-rb-event="source_click" href="${sourceHref}" target="_blank" rel="noopener noreferrer" style="color:inherit">${attribution}${business ? ` · ${business}` : ""}</a>` : `${attribution}${business ? ` · ${business}` : ""}`}${syncedAt}</div>`;
    const cta = buttonHref ? `<div style="text-align:center;margin-top:16px"><a data-rb-event="cta_click" href="${buttonHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 18px;background:${colors.accent};color:#fff;border-radius:8px;text-decoration:none;font:500 14px system-ui,sans-serif">⭐ ${reviewLabel}</a></div>` : "";
    const badge = widget.show_badge ? `<div style="text-align:center;margin-top:12px;font:12px system-ui,sans-serif"><a href="https://reviewbridge.com" target="_blank" rel="noopener noreferrer" style="color:${colors.text};opacity:.6;text-decoration:none">${tr ? "ReviewBridge tarafından desteklenir" : "Powered by ReviewBridge"}</a></div>` : "";
    const carouselAccess = layout === "carousel" ? ` tabindex="0" aria-label="${tr ? "Yorumları yatay kaydırın" : "Scroll reviews horizontally"}"` : "";
    const averageBadge = widget.show_rating_summary && widgetReviews.length ? `<div class="rb-rating-summary" aria-label="${tr ? "Ortalama puan" : "Average rating"}">★ ${averageRating}/5 · ${widgetReviews.length} ${tr ? "yorum" : "reviews"}</div>` : "";
    const dismissButton = layout === "floating" ? `<button type="button" class="rb-floating-dismiss" data-rb-dismiss aria-label="${tr ? "Yorum bandını kapat" : "Dismiss review banner"}">×</button>` : "";
    htmlByLocale[locale] = `${dismissButton}${heading}${averageBadge}<div class="rb-reviews rb-layout-${layout}" role="list" aria-label="${tr ? "Müşteri yorumları" : "Customer reviews"}"${carouselAccess}>${content}</div>${stale}${sourceAttribution}${cta}${badge}`;
  }

  const widgetId = `reviewbridge-embed-${token}`;
  const wrapperBackground = colors.background;
  const wrapperPadding = widget.theme === "minimal" ? "0" : "20px";
  const js = buildWidgetEmbedScript({
    token,
    widgetId,
    wrapperBackground,
    wrapperPadding,
    textColor: colors.text,
    fontFamily,
    widgetLocale: widget.widget_locale,
    htmlByLocale,
    layout,
    experimentEnabled: widget.experiment_enabled && widget.show_review_button && plan !== "free" && Boolean(reviewUrl),
    experimentId: widget.experiment_id,
    alternativeLabel: {
      tr: String(widget.experiment_label_tr || "Deneyimini paylaş").slice(0, 60),
      en: String(widget.experiment_label_en || "Share your experience").slice(0, 60),
    },
  });

  const etag = createWidgetEtag(js);
  const responseHeaders = {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "private, no-cache, must-revalidate",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
  };
  if (matchesWidgetEtag(_request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers: responseHeaders });
  }

  return new Response(js, {
    headers: responseHeaders,
  });
}

