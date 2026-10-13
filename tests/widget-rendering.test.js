import test from "node:test";
import assert from "node:assert/strict";
import { createWidgetEtag, filterWidgetReviews, getWidgetColors, getWidgetLocale, isAllowedWidgetDomain, matchesWidgetEtag } from "../lib/widget-rendering.js";

const sample = [
  { id: "old", reviewer_name: "A", rating: 5, body: "A helpful review", reviewed_at: "2026-01-01T00:00:00Z" },
  { id: "new", reviewer_name: "B", rating: 3, body: "Kind service", reviewed_at: "2026-03-01T00:00:00Z" },
  { id: "hidden", reviewer_name: "C", rating: 4, body: "Great service", reviewed_at: "2026-02-01T00:00:00Z" },
];

test("widget filters keywords, rating, and hidden reviews while pinning first", () => {
  const result = filterWidgetReviews(sample, {
    max_reviews: 10,
    minimum_rating: 4,
    sort_order: "newest",
    include_keywords: "service, helpful",
  }, { moderation: { hidden: "hidden", old: "pinned" }, canUseAdvancedFilters: true });
  assert.deepEqual(result.map((review) => review.id), ["old"]);
});

test("free widgets keep basic behavior and safe theme defaults", () => {
  const result = filterWidgetReviews(sample, {
    max_reviews: 2,
    minimum_rating: 5,
    sort_order: "lowest",
    include_keywords: "does-not-match",
  }, { canUseAdvancedFilters: false });
  assert.deepEqual(result.map((review) => review.id), ["new", "hidden"]);
  assert.equal(getWidgetColors({ theme: "dark", background_color: "url(javascript:)", accent_color: "#12AB34" }).background, "#1f2937");
});

test("automatic language follows browser language and explicit language wins", () => {
  assert.equal(getWidgetLocale("auto", "tr-TR"), "tr");
  assert.equal(getWidgetLocale("auto", "en-US"), "en");
  assert.equal(getWidgetLocale("en", "tr"), "en");
});

test("widget domain allowlist accepts subdomains and rejects missing or unrelated origins", () => {
  const allowed = ["example.com"];
  assert.equal(isAllowedWidgetDomain(new Request("https://app.test", { headers: { origin: "https://shop.example.com" } }), allowed), true);
  assert.equal(isAllowedWidgetDomain(new Request("https://app.test", { headers: { referer: "https://notexample.com/page" } }), allowed), false);
  assert.equal(isAllowedWidgetDomain(new Request("https://app.test"), allowed), false);
  assert.equal(isAllowedWidgetDomain(new Request("https://app.test"), []), true);
});

test("widget ETags are stable, body-specific, and support weak or wildcard validators", () => {
  const etag = createWidgetEtag("widget script");
  assert.equal(etag, createWidgetEtag("widget script"));
  assert.notEqual(etag, createWidgetEtag("changed widget script"));
  assert.equal(matchesWidgetEtag(etag, etag), true);
  assert.equal(matchesWidgetEtag(`W/${etag}`, etag), true);
  assert.equal(matchesWidgetEtag(`"other", ${etag}`, etag), true);
  assert.equal(matchesWidgetEtag("*", etag), true);
  assert.equal(matchesWidgetEtag('"other"', etag), false);
});
