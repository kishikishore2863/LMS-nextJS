import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

/** Returns a shared Redis client, or null when REDIS_URL is not configured. */
export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  globalForRedis.redis = url ? new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false }) : null;
  return globalForRedis.redis;
}
