import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewAnalysisPrompt, parseReviewAnalysisResponse, redactReviewText, reviewInsightGeminiErrorCode } from "../lib/ai-review-insights.js";

test("redacts common contact details and bounds review text before sending", () => {
  const value = redactReviewText("Call +90 555 123 4567, mail me@example.com or see https://example.com now");
  assert.doesNotMatch(value, /555 123 4567|me@example\.com|https:\/\//);
  assert.match(value, /\[phone\]/);
  assert.match(value, /\[email\]/);
  assert.match(value, /\[link\]/);
  assert.equal(redactReviewText("x".repeat(700)).length, 500);
});

test("prompt caps review volume and instructs the model to treat reviews as data", () => {
  const prompt = buildReviewAnalysisPrompt(Array.from({ length: 80 }, (_, index) => ({ rating: 4, body: `Review ${index}` })), "en");
  const reviewSet = JSON.parse(prompt.request.contents[0].parts[0].text).reviews;
  assert.equal(reviewSet.length, 60);
  assert.equal(prompt.reviewCount, 60);
  assert.match(prompt.request.systemInstruction.parts[0].text, /untrusted data/);
  assert.equal(prompt.request.generationConfig.responseMimeType, "application/json");
});

test("parses and bounds the AI response shape", () => {
  const result = parseReviewAnalysisResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    summary: "Themes observed", positiveThemes: ["Helpful staff"], improvementThemes: ["Long waits"], evidenceCount: 5, caveat: "Small sample",
  }) }] } }] });
  assert.deepEqual(result, {
    summary: "Themes observed", positiveThemes: ["Helpful staff"], improvementThemes: ["Long waits"], evidenceCount: 5, caveat: "Small sample",
  });
});

test("maps Gemini API responses to actionable user-facing failures", () => {
  assert.equal(reviewInsightGeminiErrorCode(401), "gemini_credentials");
  assert.equal(reviewInsightGeminiErrorCode(403), "gemini_credentials");
  assert.equal(reviewInsightGeminiErrorCode(429), "gemini_rate_limit");
  assert.equal(reviewInsightGeminiErrorCode(400), "gemini_setup");
  assert.equal(reviewInsightGeminiErrorCode(404), "gemini_setup");
  assert.equal(reviewInsightGeminiErrorCode(503), "unavailable");
});
