import { z } from "zod";
import { handler, ok, parseJson } from "@/lib/api";
import { lessonSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { addLesson, reorderLessons } from "@/server/services/course.service";

type Ctx = { params: Promise<{ id: string }> };
const body = z.union([z.object({ order: z.array(z.string()).min(1) }), lessonSchema]);

/** Body = lesson fields adds a lesson; { order: [lessonIds] } reorders. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("course:write");
  const { id } = await params;
  const input = await parseJson(req, body);
  if ("order" in input) {
    await reorderLessons(actor, id, input.order);
    return ok({ reordered: true });
  }
  return ok(await addLesson(actor, id, input), undefined, 201);
});
