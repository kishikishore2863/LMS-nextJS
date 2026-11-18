import "server-only";
import { Queue } from "bullmq";
import { QUEUE_NAME, type JobMap, type JobName } from "./types";

const globalForQueue = globalThis as unknown as { lmsQueue?: Queue };

function getQueue(): Queue | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  globalForQueue.lmsQueue ??= new Queue(QUEUE_NAME, { connection: { url } });
  return globalForQueue.lmsQueue;
}

/**
 * BullMQ producer. Without REDIS_URL the job runs inline (after the response is
 * built, errors are logged) so local dev works with no extra services.
 */
export async function enqueue<K extends JobName>(name: K, data: JobMap[K]) {
  const queue = getQueue();
  if (queue) {
    await queue.add(name, data, { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000 });
    return;
  }
  const { handlers } = await import("./handlers");
  try {
    await (handlers[name] as (d: JobMap[K]) => Promise<void>)(data);
  } catch (err) {
    console.error(`[jobs] inline ${name} failed`, err);
  }
}
