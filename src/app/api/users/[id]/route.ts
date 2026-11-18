import { handler, ok, parseJson } from "@/lib/api";
import { updateUserSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { updateUser } from "@/server/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("user:manage");
  const { id } = await params;
  const user = await updateUser(actor, id, await parseJson(req, updateUserSchema));
  return ok({ id: user.id, role: user.role, isActive: user.isActive });
});

/** Soft delete: deactivates the account so learning history is kept. */
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("user:manage");
  const { id } = await params;
  await updateUser(actor, id, { isActive: false });
  return ok({ id, isActive: false });
});
