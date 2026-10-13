const buckets = new Map();

// Best-effort per-process limit for serverless routes. No client IP is persisted.
export function isRateLimited(request, key, { limit = 300, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const client = request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const bucketKey = `${windowStart}:${client}:${key}`;
  const current = buckets.get(bucketKey) || { count: 0, expiresAt: (windowStart + 1) * windowMs };
  current.count += 1;
  buckets.set(bucketKey, current);
  if (buckets.size > 5000) {
    for (const [entry, value] of buckets) if (value.expiresAt <= now) buckets.delete(entry);
  }
  return current.count > limit;
}
