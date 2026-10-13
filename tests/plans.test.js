import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWidgetSettings, PLAN_LIMITS, contrastRatio } from "../lib/plans.js";

test("widget review limits match the plan page", () => {
  assert.equal(PLAN_LIMITS.free.maxReviews, 10);
  assert.equal(PLAN_LIMITS.pro.maxReviews, 20);
  assert.equal(PLAN_LIMITS.agency.maxReviews, 20);
});

test("free plan keeps paid customization limits while allowing the basic rating filter", () => {
  assert.deepEqual(normalizeWidgetSettings({
    theme: "dark",
    maxReviews: "20",
    showBadge: false,
    smartFilter: true,
    showReviewButton: true,
    showRatingSummary: true,
    fontFamily: "georgia",
    cardDensity: "compact",
    cornerStyle: "large",
  }, "free"), {
    theme: "light",
    maxReviews: 10,
    showBadge: true,
    smartFilter: false,
    showReviewButton: true,
    layout: "list",
    showRatingSummary: false,
    fontFamily: "system",
    cardDensity: "comfortable",
    cornerStyle: "medium",
    minimumRating: 1,
    sortOrder: "newest",
    includeKeywords: "",
    excludeKeywords: "",
    dateFrom: null,
    dateTo: null,
    widgetLocale: "auto",
    widgetTitle: "",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    accentColor: "#4f46e5",
    showReviewerAvatar: true,
    showReviewedDate: true,
    allowedDomains: [],
  });
});

test("free plan persists a valid minimum rating selection", () => {
  const settings = normalizeWidgetSettings({ minimumRating: "4" }, "free");
  assert.equal(settings.minimumRating, 4);
});

test("paid plans allow advertised settings but cap reviews at 20", () => {
  const settings = normalizeWidgetSettings({
    theme: "minimal",
    maxReviews: "1000",
    showBadge: false,
    smartFilter: true,
    showReviewButton: false,
  }, "pro");
  assert.equal(settings.theme, "minimal");
  assert.equal(settings.maxReviews, 20);
  assert.equal(settings.showBadge, false);
  assert.equal(settings.smartFilter, true);
});

test("paid widget settings are validated and dangerous color input is discarded", () => {
  const settings = normalizeWidgetSettings({
    layout: "carousel",
    minimumRating: "4",
    sortOrder: "highest",
    includeKeywords: "great, kind",
    dateFrom: "2026-01-01",
    dateTo: "2026-02-31",
    widgetLocale: "tr",
    widgetTitle: "Our reviews",
    backgroundColor: "url(javascript:alert(1))",
    textColor: "#ABCDEF",
    showReviewerAvatar: false,
    allowedDomains: "https://Example.com, bad host, shop.example.com",
  }, "pro");
  assert.equal(settings.layout, "carousel");
  assert.equal(settings.minimumRating, 4);
  assert.equal(settings.sortOrder, "highest");
  assert.equal(settings.includeKeywords, "great, kind");
  assert.equal(settings.widgetLocale, "tr");
  assert.equal(settings.dateTo, null);
  assert.equal(settings.backgroundColor, "#ffffff");
  assert.equal(settings.textColor, "#111827");
  assert.equal(settings.showReviewerAvatar, false);
  assert.deepEqual(settings.allowedDomains, ["example.com", "shop.example.com"]);
});

test("paid widget settings allow masonry and validate typography and card styling", () => {
  const settings = normalizeWidgetSettings({
    layout: "masonry",
    showRatingSummary: true,
    fontFamily: "georgia",
    cardDensity: "compact",
    cornerStyle: "large",
  }, "pro");
  assert.equal(settings.layout, "masonry");
  assert.equal(settings.showRatingSummary, true);
  assert.equal(settings.fontFamily, "georgia");
  assert.equal(settings.cardDensity, "compact");
  assert.equal(settings.cornerStyle, "large");
});

test("paid widget settings allow the floating review banner while free settings remain list-only", () => {
  assert.equal(normalizeWidgetSettings({ layout: "floating" }, "pro").layout, "floating");
  assert.equal(normalizeWidgetSettings({ layout: "floating" }, "agency").layout, "floating");
  assert.equal(normalizeWidgetSettings({ layout: "floating" }, "free").layout, "list");
  assert.equal(normalizeWidgetSettings({ layout: "unknown" }, "pro").layout, "list");
});

test("widget text colors preserve WCAG AA contrast against the selected background", () => {
  const settings = normalizeWidgetSettings({ backgroundColor: "#ffffff", textColor: "#ffffff" }, "pro");
  assert.equal(settings.textColor, "#111827");
  assert.ok(contrastRatio(settings.textColor, settings.backgroundColor) >= 4.5);
});

test("unknown plans receive safe free-plan defaults", () => {
  assert.equal(normalizeWidgetSettings({ maxReviews: "20" }, "enterprise").maxReviews, 10);
});
