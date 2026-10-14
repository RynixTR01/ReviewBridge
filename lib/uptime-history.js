const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const HISTORY_PAGE_COUNT = 8;

export function summarizeUptimeRuns(runs, now = Date.now()) {
  const cutoff = now - HISTORY_WINDOW_MS;
  const seen = new Set();

  return (Array.isArray(runs) ? runs : [])
    .filter((run) => {
      const timestamp = Date.parse(run?.run_started_at || run?.created_at || "");
      const id = Number(run?.id);
      const trackedEvent = run?.event === "schedule" || run?.event === "workflow_dispatch";
      const completed = run?.status === "completed" && ["success", "failure"].includes(run?.conclusion);
      const valid = Number.isSafeInteger(id) && id > 0 && trackedEvent && run?.head_branch === "main" &&
        completed && Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now;
      if (!valid || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((run) => ({
      id: Number(run.id),
      checkedAt: run.run_started_at || run.created_at,
      success: run.conclusion === "success",
      url: `https://github.com/RynixTR01/ReviewBridge/actions/runs/${Number(run.id)}`,
    }))
    .sort((a, b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt));
}

export function summarizeUptimeHours(checks, now = Date.now()) {
  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const buckets = Array.from({ length: 7 * 24 + 1 }, (_, index) => {
    const startAt = currentHour - (7 * 24 - index) * HOUR_MS;
    return { startAt, checks: [] };
  });

  for (const check of Array.isArray(checks) ? checks : []) {
    const timestamp = Date.parse(check?.checkedAt || "");
    if (!Number.isFinite(timestamp)) continue;
    const index = Math.floor((timestamp - buckets[0].startAt) / HOUR_MS);
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].checks.push(check);
  }

  return buckets.map(({ startAt, checks: hourChecks }) => ({
    startAt,
    count: hourChecks.length,
    success: hourChecks.length ? hourChecks.every((check) => check.success) : null,
    url: hourChecks.at(-1)?.url || null,
  }));
}

export async function getUptimeHistory(now = Date.now()) {
  const baseUrl = "https://api.github.com/repos/RynixTR01/ReviewBridge/actions/workflows/uptime-monitor.yml/runs";

  try {
    const pages = await Promise.all(Array.from({ length: HISTORY_PAGE_COUNT }, async (_, index) => {
      const url = new URL(baseUrl);
      url.searchParams.set("branch", "main");
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(index + 1));
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "User-Agent": "ReviewBridge status page",
        },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`GitHub Actions API returned ${response.status}`);
      return response.json();
    }));

    return summarizeUptimeRuns(pages.flatMap((payload) => payload?.workflow_runs || []), now);
  } catch {
    return null;
  }
}
