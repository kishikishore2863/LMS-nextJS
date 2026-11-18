import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/server/auth/permissions";
import { managerStats } from "@/server/services/analytics.service";

export const GET = handler(async () => {
  const actor = await requirePermission("progress:read:team");
  return ok(await managerStats(actor));
});
