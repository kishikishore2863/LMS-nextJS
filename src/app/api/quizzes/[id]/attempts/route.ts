import { handler, ok, parseJson } from "@/lib/api";
import { attemptSchema } from "@/lib/validators";
import { mutationGuard } from "@/server/auth/api";
import { submitAttempt } from "@/server/services/quiz.service";

type Ctx = { params: Promise<{ id: string }> };

/** Submit answers; auto-graded on the server. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const user = await mutationGuard("course:take");
  return ok(await submitAttempt(user, (await params).id, await parseJson(req, attemptSchema)), undefined, 201);
});
