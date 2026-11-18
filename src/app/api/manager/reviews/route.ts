import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/server/auth/permissions";
import { listPendingReviews } from "@/server/services/quiz.service";

export const GET = handler(async () => {
  const actor = await requirePermission("review:grade");
  return ok(await listPendingReviews(actor));
});
