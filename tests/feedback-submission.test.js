import test from "node:test";
import assert from "node:assert/strict";
import { submitFirstPartyFeedbackWithinPlan } from "../lib/feedback-submission.js";

function fakeDatabase(result) {
  const transactions = [];
  return {
    transactions,
    query(text, params) { return { text, params }; },
    async transaction(statements, options) {
      transactions.push({ statements, options });
      return [[], result ? [result] : []];
    },
  };
}

test("public feedback checks the current plan and writes inside one user-locked transaction", async () => {
  const database = fakeDatabase({
    source_id: "source-1", user_id: "owner-1", business_name: "Cafe",
    active: true, submission_id: "feedback-1",
  });
  const result = await submitFirstPartyFeedbackWithinPlan(database, {
    token: "a".repeat(48), name: "Guest", rating: 5, body: "Great service today.",
  });

  assert.equal(result.submission_id, "feedback-1");
  assert.equal(database.transactions.length, 1);
  assert.equal(database.transactions[0].options.isolationLevel, "ReadCommitted");
  assert.match(database.transactions[0].statements[0].text, /FOR UPDATE/i);
  assert.match(database.transactions[0].statements[1].text, /source_position <= plan_limit/i);
  assert.match(database.transactions[0].statements[1].text, /older\.platform = 'first_party'/i);
  assert.match(database.transactions[0].statements[1].text, /feedback_daily_limits/);
  assert.deepEqual(database.transactions[0].statements[1].params, [
    "a".repeat(48), "Guest", 5, "Great service today.",
  ]);
});

test("paused and daily-quota outcomes are returned without fabricating a submission", async () => {
  const paused = fakeDatabase({ source_id: "source-2", active: false, submission_id: null });
  const pausedResult = await submitFirstPartyFeedbackWithinPlan(paused, {
    token: "b".repeat(48), name: "Guest", rating: 4, body: "A sufficiently long review.",
  });
  assert.equal(pausedResult.active, false);
  assert.equal(pausedResult.submission_id, null);

  const limited = fakeDatabase({ source_id: "source-1", active: true, submission_id: null });
  const limitedResult = await submitFirstPartyFeedbackWithinPlan(limited, {
    token: "c".repeat(48), name: "Guest", rating: 3, body: "A sufficiently long review.",
  });
  assert.equal(limitedResult.active, true);
  assert.equal(limitedResult.submission_id, null);
});
