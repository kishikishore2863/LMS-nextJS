import { handler, ok, parseJson } from "@/lib/api";
import { progressSchema } from "@/lib/validators";
import { requirePermission } from "@/server/auth/permissions";
import { saveProgress } from "@/server/services/progress.service";

/** { lessonId, position, completed } — debounced every 15 s from the player (not rate-limited as a mutation burst). */
export const POST = handler(async (req: Request) => {
  const user = await requirePermission("course:take");
  return ok(await saveProgress(user, await parseJson(req, progressSchema)));
});
