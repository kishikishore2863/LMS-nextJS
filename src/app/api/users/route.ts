import { handler, ok, parseJson } from "@/lib/api";
import { createUserSchema, paginationSchema, roleSchema } from "@/lib/validators";
import { requirePermission } from "@/server/auth/permissions";
import { mutationGuard } from "@/server/auth/api";
import { createUser, listUsers } from "@/server/services/user.service";

export const GET = handler(async (req: Request) => {
  await requirePermission("user:manage");
  const sp = new URL(req.url).searchParams;
  const { cursor, limit } = paginationSchema.parse({ cursor: sp.get("cursor") ?? undefined, limit: sp.get("limit") ?? undefined });
  const role = sp.get("role") ? roleSchema.parse(sp.get("role")) : undefined;
  const res = await listUsers({ q: sp.get("q") ?? undefined, role, teamId: sp.get("teamId") ?? undefined, cursor, limit });
  return ok(res.items, { total: res.total, nextCursor: res.nextCursor ?? null });
});

export const POST = handler(async (req: Request) => {
  const actor = await mutationGuard("user:manage");
  const input = await parseJson(req, createUserSchema);
  const { user, tempPassword } = await createUser(actor, input);
  return ok({ id: user.id, email: user.email, role: user.role, tempPassword }, undefined, 201);
});
