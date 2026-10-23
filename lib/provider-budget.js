import "server-only";
import { isRateLimited } from "./rate-limit";
import { checkAiDailyLimit, checkProviderAttemptLimit, configuredDailyLimit } from "./provider-budget-core";

// Shared by initial import and retries, so deleting a source or changing IP
// cannot reset upstream request protection. These are attempt limits.
export function providerAttemptLimit(userId, plan) {
  return checkProviderAttemptLimit(
    isRateLimited, userId, plan,
    configuredDailyLimit(process.env.APIFY_DAILY_ATTEMPT_LIMIT, 100),
  );
}

export function aiDailyLimitReached() {
  return checkAiDailyLimit(
    isRateLimited, configuredDailyLimit(process.env.GEMINI_DAILY_SUMMARY_LIMIT, 100),
  );
}
