"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/auth/permissions";
import * as users from "@/server/services/user.service";
import * as teams from "@/server/services/team.service";
import * as courses from "@/server/services/course.service";
import { saveSettings, DEFAULT_SETTINGS, type SettingKey } from "@/server/services/settings.service";
import { audit } from "@/server/services/audit.service";
import { run } from "./result";
import type { z } from "zod";
import type {
  courseSchema,
  courseUpdateSchema,
  createUserSchema,
  lessonSchema,
  questionSchema,
  quizSettingsSchema,
  teamSchema,
  updateUserSchema,
} from "@/lib/validators";

// ---- Users ----
export async function createUserAction(input: z.input<typeof createUserSchema>) {
  return run(async () => {
    const actor = await requirePermission("user:manage");
    const { user, tempPassword } = await users.createUser(actor, input);
    refresh();
    return { id: user.id, tempPassword };
  });
}

export async function updateUserAction(id: string, input: z.input<typeof updateUserSchema>) {
  return run(async () => {
    const actor = await requirePermission("user:manage");
    await users.updateUser(actor, id, input);
    refresh();
  }, "User updated");
}

export async function importUsersAction(csv: string) {
  return run(async () => {
    const actor = await requirePermission("user:manage");
    const result = await users.importUsersCsv(actor, csv);
    refresh();
    return result;
  });
}

// ---- Teams ----
export async function saveTeamAction(input: z.input<typeof teamSchema>, id?: string) {
  return run(async () => {
    const actor = await requirePermission("team:manage");
    await teams.saveTeam(actor, input, id);
    refresh();
  }, "Team saved");
}

export async function deleteTeamAction(id: string) {
  return run(async () => {
    const actor = await requirePermission("team:manage");
    await teams.deleteTeam(actor, id);
    refresh();
  }, "Team deleted");
}

// ---- Categories ----
export async function createCategoryAction(name: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.createCategory(actor, name);
    refresh();
  }, "Category added");
}

export async function deleteCategoryAction(id: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.deleteCategory(actor, id);
    refresh();
  });
}

// ---- Courses ----
export async function createCourseAction(input: z.input<typeof courseSchema>) {
  const result = await run(async () => {
    const actor = await requirePermission("course:write");
    return courses.createCourse(actor, input);
  });
  if (result.ok && result.data) redirect(`/admin/courses/${result.data.id}/builder`);
  return result.ok ? { ok: true as const } : result;
}

export async function updateCourseAction(id: string, input: z.input<typeof courseUpdateSchema>) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.updateCourse(actor, id, input);
    refresh();
  }, input.status ? `Course ${input.status.toLowerCase()}` : "Course saved");
}

export async function deleteCourseAction(id: string) {
  const result = await run(async () => {
    const actor = await requirePermission("course:write");
    await courses.deleteCourse(actor, id);
  });
  if (result.ok) redirect("/admin/courses");
  return result;
}

export async function addModuleAction(courseId: string, title: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.addModule(actor, courseId, { title });
    refresh();
  });
}

export async function renameModuleAction(id: string, title: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.renameModule(actor, id, { title });
    refresh();
  });
}

export async function deleteModuleAction(id: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.deleteModule(actor, id);
    refresh();
  });
}

export async function reorderModulesAction(courseId: string, ids: string[]) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.reorderModules(actor, courseId, ids);
    refresh();
  });
}

export async function addLessonAction(moduleId: string, input: z.input<typeof lessonSchema>) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.addLesson(actor, moduleId, input);
    refresh();
  });
}

export async function updateLessonAction(id: string, input: z.input<typeof lessonSchema>) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.updateLesson(actor, id, input);
    refresh();
  }, "Lesson saved");
}

export async function deleteLessonAction(id: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.deleteLesson(actor, id);
    refresh();
  });
}

export async function reorderLessonsAction(moduleId: string, ids: string[]) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.reorderLessons(actor, moduleId, ids);
    refresh();
  });
}

export async function updateQuizSettingsAction(quizId: string, input: z.input<typeof quizSettingsSchema>) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.updateQuizSettings(actor, quizId, input);
    refresh();
  }, "Quiz settings saved");
}

export async function addQuestionAction(quizId: string, input: z.input<typeof questionSchema>) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.addQuestion(actor, quizId, input);
    refresh();
  });
}

export async function deleteQuestionAction(id: string) {
  return run(async () => {
    const actor = await requirePermission("course:write");
    await courses.deleteQuestion(actor, id);
    refresh();
  });
}

// ---- Settings ----
export async function saveSettingsAction(values: Partial<Record<SettingKey, string>>) {
  return run(async () => {
    const actor = await requirePermission("settings:manage");
    const clean = Object.fromEntries(Object.entries(values).filter(([k]) => k in DEFAULT_SETTINGS));
    await saveSettings(clean);
    await audit(actor.id, "settings.update", "Setting", "platform", clean);
    refresh();
  }, "Settings saved");
}
