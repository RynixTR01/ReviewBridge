export const PLAN_LIMITS = {
  free: {
    maxSources: 1,
    maxReviews: 10,
    canRemoveBadge: false,
    canSelectTheme: false,
    canUseAdvancedFilters: false,
    canChooseLayout: false,
    canModerateReviews: false,
    canCustomizeColors: false,
  },
  pro: {
    maxSources: 5,
    maxReviews: 20,
    canRemoveBadge: true,
    canSelectTheme: true,
    canUseAdvancedFilters: true,
    canChooseLayout: true,
    canModerateReviews: true,
    canCustomizeColors: true,
  },
  agency: {
    maxSources: Infinity,
    maxReviews: 20,
    canRemoveBadge: true,
    canSelectTheme: true,
    canUseAdvancedFilters: true,
    canChooseLayout: true,
    canModerateReviews: true,
    canCustomizeColors: true,
  },
}

export const PLAN_PRICES_USD = { free: 0, pro: 7, agency: 19 };

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255).map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function normalizeWidgetSettings(settings, planName) {
  const plan = PLAN_LIMITS[planName] ? planName : "free";
  const limits = PLAN_LIMITS[plan];
  const requestedMax = Number.parseInt(settings.maxReviews, 10);
  const maxReviews = Number.isFinite(requestedMax)
    ? Math.min(Math.max(requestedMax, 1), limits.maxReviews)
    : 5;
  const allowedThemes = new Set(["light", "dark", "minimal"]);
  const requestedTheme = allowedThemes.has(settings.theme) ? settings.theme : "light";
  const requestedLayout = ["list", "grid", "carousel"].includes(settings.layout) ? settings.layout : "list";
  const requestedSortOrder = ["newest", "highest", "lowest"].includes(settings.sortOrder)
    ? settings.sortOrder
    : "newest";
  const safeDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
  };
  const safeColor = (value, fallback) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const backgroundColor = limits.canCustomizeColors ? safeColor(settings.backgroundColor, "#ffffff") : "#ffffff";
  const requestedTextColor = limits.canCustomizeColors ? safeColor(settings.textColor, "#111827") : "#111827";
  const textColor = contrastRatio(requestedTextColor, backgroundColor) >= 4.5
    ? requestedTextColor
    : contrastRatio("#111827", backgroundColor) >= contrastRatio("#ffffff", backgroundColor) ? "#111827" : "#ffffff";
  const requestedAccentColor = limits.canCustomizeColors ? safeColor(settings.accentColor, "#4f46e5") : "#4f46e5";
  const accentColor = contrastRatio("#ffffff", requestedAccentColor) >= 4.5 ? requestedAccentColor : "#4f46e5";
  const allowedDomains = limits.canCustomizeColors
    ? [...new Set(String(settings.allowedDomains || "").split(/[\s,]+/).map((domain) => {
      try { return new URL(domain.includes("://") ? domain : `https://${domain}`).hostname.toLowerCase(); }
      catch { return ""; }
    }).filter((domain) => /^(localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})$/.test(domain)))].slice(0, 20)
    : [];

  return {
    theme: limits.canSelectTheme ? requestedTheme : "light",
    maxReviews,
    showBadge: limits.canRemoveBadge ? Boolean(settings.showBadge) : true,
    smartFilter: limits.canSelectTheme ? Boolean(settings.smartFilter) : false,
    showReviewButton: Boolean(settings.showReviewButton),
    layout: limits.canChooseLayout ? requestedLayout : "list",
    minimumRating: limits.canUseAdvancedFilters ? Math.min(5, Math.max(1, Number.parseInt(settings.minimumRating, 10) || 1)) : 1,
    sortOrder: limits.canUseAdvancedFilters ? requestedSortOrder : "newest",
    includeKeywords: limits.canUseAdvancedFilters ? String(settings.includeKeywords || "").trim().slice(0, 200) : "",
    excludeKeywords: limits.canUseAdvancedFilters ? String(settings.excludeKeywords || "").trim().slice(0, 200) : "",
    dateFrom: limits.canUseAdvancedFilters ? safeDate(settings.dateFrom) : null,
    dateTo: limits.canUseAdvancedFilters ? safeDate(settings.dateTo) : null,
    widgetLocale: ["auto", "tr", "en"].includes(settings.widgetLocale) ? settings.widgetLocale : "auto",
    widgetTitle: String(settings.widgetTitle || "").trim().slice(0, 80),
    backgroundColor,
    textColor,
    accentColor,
    showReviewerAvatar: settings.showReviewerAvatar !== false,
    showReviewedDate: settings.showReviewedDate !== false,
    allowedDomains,
  };
}
