import { handler, ok, parseJson } from "@/lib/api";
import { enrollSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { selfEnroll } from "@/server/services/enrollment.service";

export const POST = handler(async (req: Request) => {
  const user = await mutationGuard("course:take");
  const { courseId } = await parseJson(req, enrollSchema);
  const { enrollment } = await selfEnroll(user, courseId);
  return ok(enrollment, undefined, 201);
});
