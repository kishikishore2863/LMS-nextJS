import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/server/auth/permissions";
import { adminStats, parseRange } from "@/server/services/analytics.service";

export const GET = handler(async (req: Request) => {
  await requirePermission("user:manage");
  const range = parseRange(new URL(req.url).searchParams.get("range"));
  return ok(await adminStats(range), { range });
});
