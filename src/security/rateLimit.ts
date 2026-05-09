interface Hit {
  count: number;
  resetAt: number;
}

const BUCKET = new Map<string, Hit>();
let lastSweepAt = 0;

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  if (now - lastSweepAt > 60_000) {
    for (const [k, hit] of BUCKET.entries()) {
      if (hit.resetAt <= now) {
        BUCKET.delete(k);
      }
    }
    lastSweepAt = now;
  }
  const existing = BUCKET.get(key);
  if (!existing || existing.resetAt <= now) {
    BUCKET.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}
