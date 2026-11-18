import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { fail, handler, ok, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const body = z.object({
  type: z.string(),
  data: z.object({ assetId: z.string(), durationSec: z.number().nonnegative() }),
});

/** Video provider callback: asset ready → set durationSec on lessons using that asset. */
export const POST = handler(async (req: Request) => {
  const secret = process.env.VIDEO_WEBHOOK_SECRET;
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return fail("unauthorized", "Invalid webhook signature", 401);
  }
  const evt = await parseJson(req, body);
  if (evt.type !== "asset.ready") return ok({ ignored: true });
  const res = await prisma.lesson.updateMany({
    where: { contentUrl: evt.data.assetId },
    data: { durationSec: Math.round(evt.data.durationSec) },
  });
  return ok({ updated: res.count });
});
