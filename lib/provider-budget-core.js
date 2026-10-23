const DAY_MS = 86_400_000;

export function configuredDailyLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : fallback;
}

// A fixed key makes this a site-wide budget, independent of account and IP.
export async function checkProviderAttemptLimit(limiter, userId, plan, dailyLimit) {
  const accountLimited = await limiter(null, `provider-attempt:${userId}`, {
    scope: "account", failClosed: true,
    limit: { free: 5, pro: 20, agency: 60 }[plan] || 5,
    windowMs: 3_600_000,
  });
  if (accountLimited) return "account";
  const siteLimited = await limiter(null, "provider-attempt:sitewide", {
    scope: "account", failClosed: true, limit: dailyLimit, windowMs: DAY_MS,
  });
  return siteLimited ? "site" : null;
}

export async function checkAiDailyLimit(limiter, dailyLimit) {
  return limiter(null, "ai-review-insights:sitewide", {
    scope: "account", failClosed: true, limit: dailyLimit, windowMs: DAY_MS,
  });
}
