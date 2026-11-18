import "server-only";
import { getRedis } from "./redis";

/**
 * Small read-through cache for dashboard stats (section 6: 60 s per role + scope key).
 * Uses Redis when REDIS_URL is set, otherwise an in-process Map.
 */
type Entry = { value: string; expiresAt: number };
const globalForMem = globalThis as unknown as { lmsMemCache?: Map<string, Entry> };
const mem = (globalForMem.lmsMemCache ??= new Map<string, Entry>());

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return JSON.parse(hit.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSec: number) {
  const raw = JSON.stringify(value);
  const redis = getRedis();
  if (redis) await redis.set(key, raw, "EX", ttlSec);
  else mem.set(key, { value: raw, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cacheDel(...keys: string[]) {
  if (keys.length === 0) return;
  const redis = getRedis();
  if (redis) await redis.del(...keys);
  else keys.forEach((k) => mem.delete(k));
}

/** Delete every key starting with a prefix (e.g. "stats:"). */
export async function cacheDelPrefix(prefix: string) {
  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(...keys);
  } else {
    for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k);
  }
}

export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cacheSet(key, value, ttlSec);
  return value;
}
