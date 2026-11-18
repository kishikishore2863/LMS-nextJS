import { handler, ok, parseJson } from "@/lib/api";
import { courseUpdateSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { requirePermission } from "@/server/auth/permissions";
import { deleteCourse, getCourseForBuilder, updateCourse } from "@/server/services/course.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  await requirePermission("course:write");
  return ok(await getCourseForBuilder((await params).id));
});

/** Edit; `status: "PUBLISHED"` publishes. */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("course:write");
  return ok(await updateCourse(actor, (await params).id, await parseJson(req, courseUpdateSchema)));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("course:write");
  const { id } = await params;
  await deleteCourse(actor, id);
  return ok({ id });
});
