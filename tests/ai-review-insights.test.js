import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewAnalysisPrompt, parseReviewAnalysisResponse, redactReviewText } from "../lib/ai-review-insights.js";

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
  const reviewSet = JSON.parse(prompt.messages[1].content).reviews;
  assert.equal(reviewSet.length, 60);
  assert.match(prompt.messages[0].content, /untrusted data/);
});

test("parses and bounds the AI response shape", () => {
  const result = parseReviewAnalysisResponse({ choices: [{ message: { content: JSON.stringify({
    summary: "Themes observed", positiveThemes: ["Helpful staff"], improvementThemes: ["Long waits"], evidenceCount: 5, caveat: "Small sample",
  }) } }] });
  assert.deepEqual(result, {
    summary: "Themes observed", positiveThemes: ["Helpful staff"], improvementThemes: ["Long waits"], evidenceCount: 5, caveat: "Small sample",
  });
});
