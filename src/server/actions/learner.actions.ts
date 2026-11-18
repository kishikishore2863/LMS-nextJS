"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/server/auth/permissions";
import { selfEnroll } from "@/server/services/enrollment.service";
import { markAllRead } from "@/server/services/notification.service";
import { changePassword } from "@/server/services/user.service";
import { run } from "./result";

export async function enrollAction(courseId: string) {
  const result = await run(async () => {
    const user = await requirePermission("course:take");
    return selfEnroll(user, courseId);
  });
  if (result.ok && result.data) redirect(`/learner/courses/${result.data.slug}`);
  return result.ok ? { ok: true as const } : result;
}

export async function markNotificationsReadAction() {
  return run(async () => {
    const user = await requireUser();
    await markAllRead(user.id);
    refresh();
  });
}

export async function changePasswordAction(current: string, next: string) {
  return run(async () => {
    const user = await requireUser();
    await changePassword(user.id, current, next);
  }, "Password changed");
}
