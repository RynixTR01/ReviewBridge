import test from "node:test";
import assert from "node:assert/strict";
import { getUptimeHistory, summarizeUptimeHours, summarizeUptimeRuns } from "../lib/uptime-history.js";

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

test("uptime history keeps completed main-branch checks in the last 7 days", () => {
  const checks = summarizeUptimeRuns([
    run({ id: 1, run_started_at: "2026-10-14T19:45:00.000Z" }),
    run({ id: 2, conclusion: "failure", run_started_at: "2026-10-14T19:30:00.000Z" }),
    run({ id: 3, run_started_at: "2026-10-07T20:00:00.000Z" }),
    run({ id: 4, run_started_at: "2026-10-07T19:59:59.999Z" }),
    run({ id: 5, head_branch: "feature/test" }),
    run({ id: 6, event: "push" }),
    run({ id: 7, status: "in_progress" }),
    run({ id: 8, conclusion: "cancelled" }),
  ], now);

  assert.deepEqual(checks.map(({ id, success }) => ({ id, success })), [
    { id: 3, success: true },
    { id: 2, success: false },
    { id: 1, success: true },
  ]);
});

test("uptime history groups checks into hourly status buckets", () => {
  const checks = summarizeUptimeRuns([
    run({ id: 1, run_started_at: "2026-10-14T19:35:00.000Z" }),
    run({ id: 2, run_started_at: "2026-10-14T19:45:00.000Z" }),
    run({ id: 3, conclusion: "failure", run_started_at: "2026-10-14T19:50:00.000Z" }),
    run({ id: 4, run_started_at: "2026-10-14T18:15:00.000Z" }),
  ], now);
  const hours = summarizeUptimeHours(checks, now);
  const currentHour = hours.find(({ startAt }) => startAt === Date.parse("2026-10-14T19:00:00.000Z"));
  const previousHour = hours.find(({ startAt }) => startAt === Date.parse("2026-10-14T18:00:00.000Z"));
  const emptyHour = hours.find(({ startAt }) => startAt === Date.parse("2026-10-14T17:00:00.000Z"));

  assert.equal(hours.length, 169);
  assert.deepEqual({ count: currentHour.count, success: currentHour.success }, { count: 3, success: false });
  assert.deepEqual({ count: previousHour.count, success: previousHour.success }, { count: 1, success: true });
  assert.deepEqual({ count: emptyHour.count, success: emptyHour.success, url: emptyHour.url }, { count: 0, success: null, url: null });
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

test("uptime history fetches enough GitHub pages to cover seven days", async () => {
  const originalFetch = globalThis.fetch;
  const requestedPages = [];
  globalThis.fetch = async (url, options) => {
    const parsedUrl = new URL(url);
    const page = Number(parsedUrl.searchParams.get("page"));
    requestedPages.push(page);
    assert.equal(parsedUrl.searchParams.get("per_page"), "100");
    assert.equal(options.next.revalidate, 900);
    return {
      ok: true,
      json: async () => ({ workflow_runs: page === 1 ? [run({ id: 90 })] : [] }),
    };
  };

  try {
    const checks = await getUptimeHistory(now);
    assert.deepEqual(checks.map(({ id }) => id), [90]);
    assert.deepEqual(requestedPages.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
