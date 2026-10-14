import test from "node:test";
import assert from "node:assert/strict";
import { summarizeUptimeRuns } from "../lib/uptime-history.js";

const now = Date.parse("2026-10-14T20:00:00.000Z");
const run = (overrides = {}) => ({
  id: 1,
  event: "schedule",
  head_branch: "main",
  status: "completed",
  conclusion: "success",
  run_started_at: "2026-10-14T19:45:00.000Z",
  ...overrides,
});

test("uptime history keeps completed main-branch checks in the last 24 hours", () => {
  const checks = summarizeUptimeRuns([
    run({ id: 1, run_started_at: "2026-10-14T19:45:00.000Z" }),
    run({ id: 2, conclusion: "failure", run_started_at: "2026-10-14T19:30:00.000Z" }),
    run({ id: 3, run_started_at: "2026-10-13T19:45:00.000Z" }),
    run({ id: 4, head_branch: "feature/test" }),
    run({ id: 5, event: "push" }),
    run({ id: 6, status: "in_progress" }),
    run({ id: 7, conclusion: "cancelled" }),
  ], now);

  assert.deepEqual(checks.map(({ id, success }) => ({ id, success })), [
    { id: 2, success: false },
    { id: 1, success: true },
  ]);
});

test("uptime history rejects duplicate and invalid run IDs", () => {
  const checks = summarizeUptimeRuns([
    run({ id: 1 }),
    run({ id: 1, conclusion: "failure" }),
    run({ id: "not-an-id" }),
  ], now);

  assert.equal(checks.length, 1);
  assert.equal(checks[0].url, "https://github.com/RynixTR01/ReviewBridge/actions/runs/1");
});
