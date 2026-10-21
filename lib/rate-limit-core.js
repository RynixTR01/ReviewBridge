import { rateLimitBucketHash } from "./rate-limit-key.js";

// Account limits deliberately exclude the IP: moving networks must not create
// a fresh allowance for a paid upstream API.
export function createRateLimiter({ queryOne, env = process.env, now = Date.now }) {
  const buckets = new Map();
  return async function isRateLimited(request, key, {
    limit = 300, windowMs = 60_000, scope = "ip", failClosed = false,
  } = {}) {
    if (!["ip", "account"].includes(scope) || !Number.isSafeInteger(limit) || limit < 1
      || !Number.isSafeInteger(windowMs) || windowMs < 1 || !key) {
      throw new TypeError("Invalid rate limit configuration.");
    }
    const time = now();
    const windowStart = Math.floor(time / windowMs);
    const headers = request?.headers || request;
    const client = scope === "account" ? "account"
      : headers?.get("x-real-ip") || headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const secret = env.RATE_LIMIT_HASH_SECRET || env.CRON_SECRET;
    const bucketKey = `${windowMs}:${key}`;
    if (env.DATABASE_URL && secret) {
      try {
        const row = await queryOne(
          `INSERT INTO public.request_rate_limits (bucket_hash, window_start, request_count, expires_at)
           VALUES ($1, $2, 1, $3)
           ON CONFLICT (bucket_hash, window_start) DO UPDATE
           SET request_count = LEAST(public.request_rate_limits.request_count + 1, $4),
               expires_at = GREATEST(public.request_rate_limits.expires_at, EXCLUDED.expires_at)
           RETURNING request_count`,
          [rateLimitBucketHash(client, bucketKey, secret), windowStart,
            new Date((windowStart + 1) * windowMs + 86_400_000).toISOString(), limit + 1],
        );
        if (!row || !Number.isFinite(Number(row.request_count))) throw new Error("Missing limiter result.");
        return Number(row.request_count) > limit;
      } catch {
        if (failClosed) return true;
        console.error("Shared request limiter unavailable; using a per-instance fallback.");
      }
    } else if (failClosed) {
      return true;
    }
    for (const [entry, value] of buckets) if (value.expiresAt <= time) buckets.delete(entry);
    const localKey = `${windowStart}:${client}:${bucketKey}`;
    if (buckets.size >= 5000 && !buckets.has(localKey)) return true;
    const current = buckets.get(localKey) || { count: 0, expiresAt: (windowStart + 1) * windowMs };
    current.count = Math.min(current.count + 1, limit + 1);
    buckets.set(localKey, current);
    return current.count > limit;
  };
}
