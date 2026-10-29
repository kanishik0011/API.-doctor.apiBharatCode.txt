type Bucket = { count: number; resetsAt: number };

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function takeRateLimit(key: string, limit: number, now = Date.now()): RateLimitResult {
  if (buckets.size > 1_000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetsAt <= now) buckets.delete(bucketKey);
  }
  const current = buckets.get(key);
  const bucket = !current || current.resetsAt <= now ? { count: 0, resetsAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetsAt - now) / 1_000)),
  };
}

export function requestClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || headers.get("x-real-ip") || "unknown-client").slice(0, 128);
}

export function resetRateLimitsForTests() { buckets.clear(); }
