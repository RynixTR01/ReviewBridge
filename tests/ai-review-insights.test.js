import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewAnalysisPrompt, parseReviewAnalysisResponse, redactReviewText, reviewInsightError, reviewInsightGeminiErrorCode } from "../lib/ai-review-insights.js";

test("redacts common contact details and bounds review text before sending", () => {
  const value = redactReviewText("Call +90 555 123 4567, mail me@example.com or see https://example.com now");
  assert.doesNotMatch(value, /555 123 4567|me@example\.com|https:\/\//);
  assert.match(value, /\[phone\]/);
  assert.match(value, /\[email\]/);
  assert.match(value, /\[link\]/);
  assert.equal(redactReviewText("x".repeat(700)).length, 500);
});

test("prompt includes every written review and the full rating profile", () => {
  const prompt = buildReviewAnalysisPrompt([
    ...Array.from({ length: 80 }, (_, index) => ({ rating: (index % 5) + 1, body: `Review ${index}` })),
    { rating: 5, body: "   " },
  ], "en");
  const reviewSet = JSON.parse(prompt.request.contents[0].parts[0].text).reviews;
  assert.equal(reviewSet.length, 80);
  assert.equal(prompt.reviewCount, 80);
  assert.equal(prompt.totalReviewCount, 81);
  assert.equal(prompt.ratingProfile.writtenReviewCount, 80);
  assert.equal(prompt.ratingProfile.ratingDistribution[1], 16);
  assert.equal(prompt.ratingProfile.ratingDistribution[5], 17);
  assert.equal(reviewSet.at(-1).ref, 80);
  assert.match(prompt.request.systemInstruction.parts[0].text, /untrusted data/);
  assert.equal(prompt.request.generationConfig.responseMimeType, "application/json");
});

test("parses evidence-backed themes and drops refs that do not identify supplied reviews", () => {
  const result = parseReviewAnalysisResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    summary: "Themes observed", positiveThemes: [{ theme: "Helpful staff", detail: "Reviewers praise attentive service.", reviewRefs: [1, 2, 2, 99] }], improvementThemes: [{ theme: "Wait time", detail: "Several reviews mention delays.", reviewRefs: [3, 4] }], actions: [{ action: "Review staffing at busy periods.", reviewRefs: [3, 4, 88] }], caveat: "Small sample",
  }) }] } }] }, 5);
  assert.deepEqual(result, {
    summary: "Themes observed",
    positiveThemes: [{ theme: "Helpful staff", detail: "Reviewers praise attentive service.", reviewRefs: [1, 2], evidenceCount: 2 }],
    improvementThemes: [{ theme: "Wait time", detail: "Several reviews mention delays.", reviewRefs: [3, 4], evidenceCount: 2 }],
    actions: [{ action: "Review staffing at busy periods.", reviewRefs: [3, 4], evidenceCount: 2 }],
    caveat: "Small sample",
  });
});

test("does not expose the AI provider name in user-facing failures", () => {
  for (const code of ["gemini_config", "gemini_credentials", "gemini_setup", "gemini_rate_limit"]) {
    assert.doesNotMatch(reviewInsightError("tr", code), /google|gemini|api/i);
    assert.doesNotMatch(reviewInsightError("en", code), /google|gemini|api/i);
  }
});

test("maps Gemini API responses to actionable user-facing failures", () => {
  assert.equal(reviewInsightGeminiErrorCode(401), "gemini_credentials");
  assert.equal(reviewInsightGeminiErrorCode(403), "gemini_credentials");
  assert.equal(reviewInsightGeminiErrorCode(429), "gemini_rate_limit");
  assert.equal(reviewInsightGeminiErrorCode(400), "gemini_setup");
  assert.equal(reviewInsightGeminiErrorCode(404), "gemini_setup");
  assert.equal(reviewInsightGeminiErrorCode(503), "unavailable");
});
