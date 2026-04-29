/**
 * In-memory rate limiting (per server instance). Vercel: mitigates abuse; not a global quota.
 * For production at scale, use Redis/Upstash.
 */
const buckets = new Map<string, { n: number; reset: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    // prune old keys occasionally
    if (buckets.size > 50_000) {
      for (const [k, v] of buckets) {
        if (now > v.reset) buckets.delete(k);
      }
    }
    return true;
  }
  if (b.n >= max) return false;
  b.n += 1;
  return true;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
