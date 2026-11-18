import { handler, ok, parseJson } from "@/lib/api";
import { assignmentSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { assignCourse } from "@/server/services/enrollment.service";

/** Body: { courseId, userIds[] or teamId, dueDate } */
export const POST = handler(async (req: Request) => {
  const actor = await mutationGuard("assignment:create");
  return ok(await assignCourse(actor, await parseJson(req, assignmentSchema)), undefined, 201);
});
