import "server-only";
import { getRedis } from "./redis";
import { AppError } from "./errors";

const globalForRl = globalThis as unknown as { lmsRl?: Map<string, { count: number; resetAt: number }> };
const mem = (globalForRl.lmsRl ??= new Map());

/** Fixed-window limiter: 100 mutations / minute / user (section 6). */
export async function rateLimit(key: string, limit = 100, windowSec = 60) {
  const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const redis = getRedis();
  let count: number;
  if (redis) {
    count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSec);
  } else {
    const now = Date.now();
    const cur = mem.get(bucket);
    count = cur && cur.resetAt > now ? cur.count + 1 : 1;
    mem.set(bucket, { count, resetAt: now + windowSec * 1000 });
    if (mem.size > 10_000) for (const [k, v] of mem) if (v.resetAt < now) mem.delete(k);
  }
  if (count > limit) throw new AppError("rate_limited", "Too many requests — try again in a minute", 429);
}
