import { handler, ok, parseJson } from "@/lib/api";
import { gradeSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { gradeAttempt } from "@/server/services/quiz.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, { params }: Ctx) => {
  const actor = await mutationGuard("review:grade");
  return ok(await gradeAttempt(actor, (await params).id, await parseJson(req, gradeSchema)));
});
