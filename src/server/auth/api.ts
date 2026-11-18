import "server-only";
import { rateLimit } from "@/lib/rate-limit";
import { requirePermission, requireUser } from "./permissions";
import type { Permission } from "./policy";

/** For mutating route handlers: permission check + per-user rate limit. */
export async function mutationGuard(p?: Permission) {
  const user = p ? await requirePermission(p) : await requireUser();
  await rateLimit(user.id);
  return user;
}
