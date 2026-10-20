import { buildGoogleReviewUrl } from "@/app/lib/googleReviewUrl";
import { query, queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { normalizeWidgetSettings, PLAN_LIMITS } from "@/lib/plans";
import { filterWidgetReviews, getWidgetColors } from "@/lib/widget-rendering";
import FloatingPreviewShell from "./FloatingPreviewShell";
import BrandMark from "@/components/BrandMark";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: `${t(locale, "Bileşen önizlemesi", "Widget preview")} — ReviewBridge`,
    description: t(locale, "ReviewBridge bileşeninizin gerçek bir web sitesinde nasıl görüneceğini önizleyin.", "Preview how your ReviewBridge widget will look on a real website."),
  };
}

// Public page — the unguessable embed token grants read access to this widget.

function createStarsHtml(rating) {
  let stars = "";
  for (let i = 0; i < 5; i++) {
    const color = i < rating ? "#fbbf24" : "#d1d5db";
    stars += `<svg style="width:14px;height:14px;color:${color}" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
  }
  return stars;
}

export default async function PreviewPage({ params }) {
  const locale = await getLocale();
  const resolvedParams = await params;
  const token = resolvedParams.token;

  // Fetch widget
  const widget = await queryOne(
    `SELECT w.*, u.plan AS current_user_plan, s.business_name, s.platform AS current_source_platform,
            s.last_synced_at, s.sync_status
     FROM public.widgets w JOIN public.users u ON u.id = w.user_id
     JOIN public.sources s ON s.id = w.source_id WHERE w.embed_token = $1`,
    [token]
  );

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(locale, "Bileşen bulunamadı", "Widget not found")}</h1>
          <p className="text-gray-500">{t(locale, "Önizleme bağlantısı geçersiz veya bileşen silinmiş.", "The preview link is invalid or the widget has been deleted.")}</p>
        </div>
      </div>
    );
  }

  const userPlan = widget.current_user_plan || widget.user_plan || "free";
  const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  const safeSettings = normalizeWidgetSettings({
    theme: widget.theme, maxReviews: widget.max_reviews, showBadge: widget.show_badge,
    smartFilter: widget.smart_filter, showReviewButton: widget.show_review_button,
    layout: widget.layout, minimumRating: widget.minimum_rating, sortOrder: widget.sort_order,
    includeKeywords: widget.include_keywords, excludeKeywords: widget.exclude_keywords,
    dateFrom: widget.date_from ? String(widget.date_from).slice(0, 10) : "",
    dateTo: widget.date_to ? String(widget.date_to).slice(0, 10) : "",
    widgetLocale: widget.widget_locale, widgetTitle: widget.widget_title,
    backgroundColor: widget.background_color, textColor: widget.text_color,
    accentColor: widget.accent_color, showReviewerAvatar: widget.show_reviewer_avatar,
    showReviewedDate: widget.show_reviewed_date,
    showRatingSummary: widget.show_rating_summary, fontFamily: widget.font_family,
    cardDensity: widget.card_density, cornerStyle: widget.corner_style,
  }, userPlan);
  Object.assign(widget, safeSettings, {
    max_reviews: safeSettings.maxReviews, minimum_rating: safeSettings.minimumRating,
    sort_order: safeSettings.sortOrder, include_keywords: safeSettings.includeKeywords,
    exclude_keywords: safeSettings.excludeKeywords, date_from: safeSettings.dateFrom,
    date_to: safeSettings.dateTo, widget_locale: safeSettings.widgetLocale,
    widget_title: safeSettings.widgetTitle, background_color: safeSettings.backgroundColor,
    text_color: safeSettings.textColor, accent_color: safeSettings.accentColor,
    show_reviewer_avatar: safeSettings.showReviewerAvatar, show_reviewed_date: safeSettings.showReviewedDate,
    show_badge: safeSettings.showBadge, smart_filter: safeSettings.smartFilter,
    show_review_button: safeSettings.showReviewButton,
    show_rating_summary: safeSettings.showRatingSummary, font_family: safeSettings.fontFamily,
    card_density: safeSettings.cardDensity, corner_style: safeSettings.cornerStyle,
  });
  const widgetDisplayLocale = widget.widget_locale === "auto" ? locale : widget.widget_locale;
  const reviewLimit = Math.min(Number(widget.max_reviews) || 5, limits.maxReviews);
  const isSmartFilterOn = widget.smart_filter === true || widget.smart_filter === "true";
  const fetchLimit = isSmartFilterOn && userPlan !== "free" ? 50 : reviewLimit;

  let reviewUrl = null;
  let buttonLabel = '';

  if (widget.show_review_button && widget.source_platform) {
    if (widget.source_platform === 'google') {
      reviewUrl = buildGoogleReviewUrl(widget.source_place_id || widget.source_maps_url);
      buttonLabel = t(widgetDisplayLocale, "⭐ Google'da yorum bırak", "⭐ Leave a review on Google");
    } else if (widget.source_platform === 'trustpilot') {
      const domain = widget.source_place_id;
      reviewUrl = domain
        ? 'https://www.trustpilot.com/review/' + domain + '#writeareview'
        : null;
      buttonLabel = t(widgetDisplayLocale, "⭐ Trustpilot'ta yorum bırak", "⭐ Leave a review on Trustpilot");
    } else if (widget.source_platform === "first_party" && /^[a-f0-9]{48}$/.test(widget.source_place_id || "")) {
      reviewUrl = `/collect/${widget.source_place_id}`;
      buttonLabel = t(widgetDisplayLocale, "Geri bildirim bırak", "Leave feedback");
    }
  }

  const fetchedReviews = await query(
    'SELECT * FROM public.reviews WHERE source_id = $1 ORDER BY reviewed_at DESC LIMIT $2',
    [widget.source_id, Math.max(fetchLimit, 100)]
  );
  const moderationRows = limits.canModerateReviews
    ? await query("SELECT review_id, state FROM public.widget_review_preferences WHERE widget_id = $1", [widget.id])
    : [];
  const moderation = Object.fromEntries((moderationRows || []).map((row) => [row.review_id, row.state]));
  const reviewsList = filterWidgetReviews(fetchedReviews, { ...widget, max_reviews: reviewLimit }, {
    moderation,
    canUseAdvancedFilters: limits.canUseAdvancedFilters,
    canFilterRating: limits.canFilterRating,
    canUseSmartFilter: limits.canSelectTheme,
  });

  // Theme
  const colors = getWidgetColors(widget);
  const bg = colors.background;
  const text = colors.text;
  const border = colors.border;
  const cardBg = colors.card;
  const shadow = colors.shadow;
  const layout = limits.canChooseLayout && ["grid", "carousel", "masonry", "floating"].includes(widget.layout) ? widget.layout : "list";
  const previewReviews = layout === "floating" ? reviewsList.slice(0, 1) : reviewsList;
  const previewFont = widget.font_family === "arial" ? "Arial, sans-serif" : widget.font_family === "georgia" ? "Georgia, serif" : "system-ui, sans-serif";
  const cardPadding = widget.card_density === "compact" ? 10 : 16;
  const cardRadius = { small: 6, medium: 12, large: 20 }[widget.corner_style] || 12;
  const averageRating = reviewsList.length
    ? (reviewsList.reduce((total, review) => total + Number(review.rating || 0), 0) / reviewsList.length).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
          <BrandMark size={28} />
          ReviewBridge
          <span className="text-xs font-normal text-gray-400 ml-2">{t(locale, "Bileşen önizlemesi", "Widget preview")}</span>
        </div>
        <CopyPreviewButton token={token} />
      </header>

      {/* Fake Browser */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Browser Chrome */}
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-400 font-mono">
              {t(locale, "siteniz.com", "yourwebsite.com")}
            </div>
          </div>

          {/* Fake Website Content */}
          <div className="relative p-6 md:p-8" style={{ backgroundColor: widget.theme === "dark" ? "#111827" : "#f9fafb", minHeight: layout === "floating" ? 480 : undefined }}>
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: widget.theme === "dark" ? "#f9fafb" : "#111827" }}
            >
              {t(locale, "Mağazamıza hoş geldiniz", "Welcome to Our Store")}
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: widget.theme === "dark" ? "#9ca3af" : "#6b7280" }}
            >
              {t(locale, "Müşterilerimizin hakkımızda neler söylediğini görün.", "See what our customers are saying about us.")}
            </p>

            {/* Widget Rendered Inline */}
            <FloatingPreviewShell enabled={layout === "floating"} closeLabel={t(widgetDisplayLocale, "Yorum bandını kapat", "Dismiss review banner")} restoreLabel={t(widgetDisplayLocale, "Bandı göster", "Show banner")}>
            <div
              style={{
                width: layout === "floating" ? "100%" : "100%",
                maxWidth: layout === "floating" ? 380 : layout === "grid" || layout === "masonry" ? 640 : 500,
                margin: layout === "floating" ? 0 : "0 auto",
                background: bg,
                borderRadius: 16,
                padding: layout === "floating" ? "38px 12px 12px" : widget.theme === "minimal" ? 0 : 20,
                boxSizing: "border-box",
                fontFamily: previewFont,
              }}
            >
              {widget.widget_title && <h3 style={{ color: text, fontSize: 18, fontWeight: 600, marginBottom: 14, fontFamily: previewFont }}>{widget.widget_title}</h3>}
              {widget.show_rating_summary && reviewsList.length > 0 && <div style={{ width: "fit-content", margin: "0 auto 14px", borderRadius: 999, background: "#fffbeb", color: "#92400e", padding: "8px 14px", fontSize: 14, fontWeight: 600, fontFamily: previewFont }}>★ {averageRating}/5 · {reviewsList.length} {t(widgetDisplayLocale, "yorum", "reviews")}</div>}
              <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : layout === "carousel" ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2" : layout === "masonry" ? "columns-1 sm:columns-2 gap-3" : "space-y-3"} style={{ fontFamily: previewFont }}>
              {reviewsList.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: text,
                    opacity: 0.6,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {t(widgetDisplayLocale, "Yorum bulunamadı.", "No reviews found.")}
                </p>
              ) : (
                previewReviews.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: cardBg,
                      border: border,
                      borderRadius: cardRadius,
                      padding: cardPadding,
                      marginBottom: layout === "list" ? 12 : 0,
                      minWidth: layout === "carousel" ? "82%" : 0,
                      breakInside: layout === "masonry" ? "avoid" : undefined,
                      scrollSnapAlign: layout === "carousel" ? "start" : undefined,
                      boxShadow: shadow,
                      fontFamily: previewFont,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      {widget.show_reviewer_avatar !== false && <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#eef2ff",
                          color: "#6366f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: 14,
                        }}
                      >
                        {r.reviewer_name?.charAt(0).toUpperCase() || "A"}
                      </div>}
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: text,
                          }}
                        >
                          {r.reviewer_name}
                        </div>
                        <div
                          style={{ display: "flex", gap: 2, marginTop: 2 }}
                          dangerouslySetInnerHTML={{
                            __html: createStarsHtml(r.rating),
                          }}
                        />
                      </div>
                    </div>
                    {r.body && (
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: text,
                          opacity: 0.9,
                          margin: 0,
                        }}
                      >
                        {r.body}
                      </p>
                    )}
                    {widget.show_reviewed_date !== false && r.reviewed_at && <p style={{ color: text, opacity: 0.6, fontSize: 12, marginTop: 8 }}>{new Date(r.reviewed_at).toLocaleDateString(widgetDisplayLocale === "tr" ? "tr-TR" : "en-US")}</p>}
                  </div>
                ))
              )}
              </div>

              {widget.show_review_button && reviewUrl && buttonLabel && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <a 
                    href={reviewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: colors.accent,
                      color: '#ffffff',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'system-ui, sans-serif'
                    }}
                  >
                    {buttonLabel}
                  </a>
                </div>
              )}

              {widget.show_badge && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 16,
                      fontFamily: previewFont,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: text,
                      opacity: 0.6,
                    }}
                  >
                    {t(locale, "ReviewBridge tarafından desteklenir", "Powered by ReviewBridge")}
                  </span>
                </div>
              )}
              {widget.current_source_platform !== "first_party" && (widget.sync_status === "error" || !widget.last_synced_at) && <p style={{ color: "#b45309", fontSize: 12, textAlign: "center", marginTop: 10 }}>{widget.sync_status === "error" ? t(widgetDisplayLocale, "Son eşitleme başarısız oldu.", "The latest sync failed.") : t(widgetDisplayLocale, "Henüz başarılı bir eşitleme yok.", "No successful sync yet.")}</p>}
              <p style={{ color: text, opacity: 0.6, fontSize: 12, textAlign: "center", marginTop: 10 }}>
                {widget.current_source_platform === "google" ? "Google" : widget.current_source_platform === "trustpilot" ? "Trustpilot" : t(widgetDisplayLocale, "Doğrudan geri bildirim", "Direct feedback")} · {widget.business_name}
                {widget.current_source_platform !== "first_party" && widget.last_synced_at && <> · {t(widgetDisplayLocale, "Son güncelleme", "Last updated")}: {new Date(widget.last_synced_at).toLocaleDateString(widgetDisplayLocale === "tr" ? "tr-TR" : "en-US")}</>}
              </p>
            </div>
            </FloatingPreviewShell>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for copy button
function CopyPreviewButton({ token }) {
  return <CopyPreviewButtonClient token={token} />;
}

// We need to import this separately as a client component
import CopyPreviewButtonClient from "./CopyButton";
