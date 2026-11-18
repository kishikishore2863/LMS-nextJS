"use server";

import { refresh } from "next/cache";
import { requirePermission } from "@/server/auth/permissions";
import { assignCourse } from "@/server/services/enrollment.service";
import { gradeAttempt } from "@/server/services/quiz.service";
import { run } from "./result";
import type { z } from "zod";
import type { assignmentSchema } from "@/lib/validators";

/** Flow A — assignCourse → requirePermission("assignment:create") → scope check (in service). */
export async function assignCourseAction(input: z.input<typeof assignmentSchema>) {
  return run(async () => {
    const actor = await requirePermission("assignment:create");
    const res = await assignCourse(actor, input);
    refresh();
    return res;
  });
}

export async function gradeAttemptAction(attemptId: string, score: number) {
  return run(async () => {
    const actor = await requirePermission("review:grade");
    const res = await gradeAttempt(actor, attemptId, { score });
    refresh();
    return res;
  });
}
