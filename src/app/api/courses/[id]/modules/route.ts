import { z } from "zod";
import { handler, ok, parseJson } from "@/lib/api";
import { moduleSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { addModule, reorderModules } from "@/server/services/course.service";

type Ctx = { params: Promise<{ id: string }> };
const body = z.union([moduleSchema, z.object({ order: z.array(z.string()).min(1) })]);

/** Body { title } adds a module; { order: [moduleIds] } reorders. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("course:write");
  const { id } = await params;
  const input = await parseJson(req, body);
  if ("order" in input) {
    await reorderModules(actor, id, input.order);
    return ok({ reordered: true });
  }
  return ok(await addModule(actor, id, input), undefined, 201);
});
