const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

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

export async function getUptimeHistory(now = Date.now()) {
  const url = new URL("https://api.github.com/repos/RynixTR01/ReviewBridge/actions/workflows/uptime-monitor.yml/runs");
  url.searchParams.set("branch", "main");
  url.searchParams.set("per_page", "100");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "ReviewBridge status page",
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return summarizeUptimeRuns(payload?.workflow_runs, now);
  } catch {
    return null;
  }
}
