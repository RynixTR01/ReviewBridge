import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSurveyScores } from "../lib/survey-score.js";

test("NPS reports promoter minus detractor percentage", () => {
  assert.deepEqual(summarizeSurveyScores("nps", { responseCount: 5, promoters: 2, detractors: 2, average: 6.64 }), {
    total: 5,
    score: 0,
    average: 6.6,
  });
});

test("CSAT reports the share of satisfied 4 and 5 ratings", () => {
  assert.deepEqual(summarizeSurveyScores("csat", { responseCount: 4, satisfied: 2, average: 3.25 }), {
    total: 4,
    score: 50,
    average: 3.3,
  });
});

test("empty survey results have no score", () => {
  assert.deepEqual(summarizeSurveyScores("nps", { responseCount: 0 }), { total: 0, score: null, average: null });
});
