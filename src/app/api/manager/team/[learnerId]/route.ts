import { handler, ok } from "@/lib/api";
import { assertLearnerInScope, requirePermission } from "@/server/auth/permissions";
import { learnerDrilldown } from "@/server/services/analytics.service";

type Ctx = { params: Promise<{ learnerId: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const actor = await requirePermission("progress:read:team");
  const { learnerId } = await params;
  await assertLearnerInScope(actor, learnerId);
  return ok(await learnerDrilldown(learnerId));
});
