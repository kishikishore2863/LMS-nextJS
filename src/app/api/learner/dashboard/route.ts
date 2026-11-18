import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/server/auth/permissions";
import { learnerDashboard } from "@/server/services/analytics.service";

export const GET = handler(async () => {
  const user = await requirePermission("course:take");
  return ok(await learnerDashboard(user.id));
});
