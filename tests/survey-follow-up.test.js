import test from "node:test";
import assert from "node:assert/strict";
import { getSurveyFollowUp } from "../lib/survey-follow-up.js";
import { buildUsageLimitEmail } from "../lib/usage-limit-email-copy.js";

test("NPS follow-up prompt branches at detractor, passive, and promoter scores", () => {
  assert.equal(getSurveyFollowUp("nps", 6), "improve");
  assert.equal(getSurveyFollowUp("nps", 7), "feedback");
  assert.equal(getSurveyFollowUp("nps", 8), "feedback");
  assert.equal(getSurveyFollowUp("nps", 9), "recommend");
});

test("CSAT follow-up prompt asks for recovery or a positive detail", () => {
  assert.equal(getSurveyFollowUp("csat", 3), "recover");
  assert.equal(getSurveyFollowUp("csat", 4), "positive");
});

test("invalid and unselected scores use the neutral prompt", () => {
  assert.equal(getSurveyFollowUp("nps", null), "general");
  assert.equal(getSurveyFollowUp("csat", 8), "general");
  assert.equal(getSurveyFollowUp("other", 5), "general");
});

test("usage limit notice is localized and only contains the plan limit and upgrade link", () => {
  const email = buildUsageLimitEmail({ locale: "en", count: 5, limit: 5, upgradeUrl: "https://review-bridge.vercel.app/dashboard/upgrade" });
  assert.match(email.subject, /source limit/i);
  assert.match(email.text, /5 of 5 sources/);
  assert.match(email.text, /once every 30 days/);
  assert.doesNotMatch(email.text, /undefined|null/);
});
