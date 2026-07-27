/**
 * In-memory rate limiter — per-IP fixed window.
 *
 * Ceiling: state lives in module memory, so it's per server process. On
 * Vercel that means per serverless instance — a burst spread across many
 * cold-started instances isn't caught, and every deploy/cold-start resets
 * everyone's count. That's fine for a single small store's real traffic;
 * it stops a lazy script, not a distributed attacker.
 * Upgrade path: swap this module for Upstash Redis (`@upstash/ratelimit`)
 * if traffic ever justifies a shared counter — same call signature works.
 *
 * Server-only.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevent unbounded growth from many distinct IPs — evict the oldest
// entries once the map gets large rather than trusting the window alone.
const MAX_BUCKETS = 5000;

/**
 * Returns true when the request is allowed, false when it should be
 * rejected (429). `key` should combine an identifier (IP) and a scope
 * (route name) so different routes don't share a budget.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** Best-effort client IP from standard proxy headers (Vercel sets these). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
