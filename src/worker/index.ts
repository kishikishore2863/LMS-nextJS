/**
 * BullMQ worker — run with `npm run worker` (requires REDIS_URL).
 * Consumes emails, certificate generation and reminder jobs.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import { QUEUE_NAME, type JobName } from "../server/jobs/types";
import { handlers } from "../server/jobs/handlers";

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL is not set — jobs run inline in the web app instead.");
  process.exit(1);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const handler = handlers[job.name as JobName] as ((d: unknown) => Promise<void>) | undefined;
    if (!handler) throw new Error(`Unknown job ${job.name}`);
    await handler(job.data);
  },
  { connection: { url }, concurrency: 5 },
);

worker.on("completed", (job) => console.info(`[worker] ${job.name} #${job.id} done`));
worker.on("failed", (job, err) => console.error(`[worker] ${job?.name} #${job?.id} failed`, err));
console.info("[worker] listening on queue", QUEUE_NAME);
