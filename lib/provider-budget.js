import "server-only";
import { isRateLimited } from "./rate-limit";

// Shared by initial import and retries, so deleting a source or changing IP
// cannot reset upstream request protection. These are attempt limits.
export function providerAttemptLimited(userId, plan) {
  return isRateLimited(null, `provider-attempt:${userId}`, {
    scope: "account", failClosed: true,
    limit: { free: 5, pro: 20, agency: 60 }[plan] || 5,
    windowMs: 3600_000,
  });
}
