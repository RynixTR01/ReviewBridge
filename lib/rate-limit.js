import { queryOne } from "@/lib/db";
import { rateLimitBucketHash } from "@/lib/rate-limit-key";

const buckets = new Map();

function isLocallyRateLimited(client, key, windowStart, windowMs, limit, now) {
  const bucketKey = `${windowStart}:${client}:${key}`;
  const current = buckets.get(bucketKey) || { count: 0, expiresAt: (windowStart + 1) * windowMs };
  current.count += 1;
  buckets.set(bucketKey, current);
  if (buckets.size > 5000) {
    for (const [entry, value] of buckets) if (value.expiresAt <= now) buckets.delete(entry);
  }
  return current.count > limit;
}

// Shared across serverless instances when DATABASE_URL and a stable secret are configured.
export async function isRateLimited(request, key, { limit = 300, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const requestHeaders = request?.headers || request;
  const client = requestHeaders.get("x-real-ip")
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";

  const secret = process.env.RATE_LIMIT_HASH_SECRET || process.env.CRON_SECRET;
  if (process.env.DATABASE_URL && secret) {
    try {
      const bucketHash = rateLimitBucketHash(client, key, secret);
      const expiresAt = new Date((windowStart + 1) * windowMs + 24 * 60 * 60 * 1000).toISOString();
      const row = await queryOne(
        `INSERT INTO public.request_rate_limits (bucket_hash, window_start, request_count, expires_at)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (bucket_hash, window_start) DO UPDATE
         SET request_count = LEAST(public.request_rate_limits.request_count + 1, $4),
             expires_at = GREATEST(public.request_rate_limits.expires_at, EXCLUDED.expires_at)
         RETURNING request_count`,
        [bucketHash, windowStart, expiresAt, limit + 1],
      );
      return Number(row?.request_count) > limit;
    } catch {
      // Keep the application available during a transient limiter-table/database issue.
      console.error("Shared request limiter unavailable; using a per-instance fallback.");
    }
  }

  return isLocallyRateLimited(client, key, windowStart, windowMs, limit, now);
}
