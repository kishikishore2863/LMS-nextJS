import { handler, ok, parseJson } from "@/lib/api";
import { courseSchema } from "@/lib/validators";
import { requireUser } from "@/server/auth/permissions";
import { hasPermission } from "@/server/auth/policy";
import { mutationGuard } from "@/server/auth/api";
import { catalog, createCourse, listCoursesAdmin } from "@/server/services/course.service";

/** Admins see every course; everyone else sees the published catalogue. */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? undefined;
  if (hasPermission(user.role, "course:write") && sp.get("all") === "1") return ok(await listCoursesAdmin({ q }));
  return ok(await catalog({ q, categoryId: sp.get("categoryId") ?? undefined, userId: user.id }));
});

export const POST = handler(async (req: Request) => {
  const actor = await mutationGuard("course:write");
  return ok(await createCourse(actor, await parseJson(req, courseSchema)), undefined, 201);
});
