const store = new Map<string, number[]>()

/**
 * Sliding-window rate limiter backed by an in-memory Map.
 * Returns true if the request is allowed, false if the limit is exceeded.
 *
 * Key format suggestion: "<action>:<identifier>" e.g. "register:192.168.1.1"
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const hits = (store.get(key) ?? []).filter((t) => t > windowStart)
  if (hits.length >= limit) return false
  hits.push(now)
  store.set(key, hits)
  return true
}
