import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { progressSchema } from "@/lib/validators";
import type { SessionUser } from "@/server/auth/permissions";
import { recomputeEnrollment } from "./enrollment.service";
import type { z } from "zod";

/** Flow B step 1–3: upsert LessonProgress, then roll up into the enrolment. */
export async function saveProgress(user: SessionUser, input: z.input<typeof progressSchema>) {
  const data = progressSchema.parse(input);
  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
    select: { id: true, type: true, module: { select: { courseId: true } } },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  const courseId = lesson.module.courseId;
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!enrolled) throw new ForbiddenError("not_enrolled");
  if (lesson.type === "QUIZ" && data.completed) {
    throw new ValidationError("Quiz lessons are completed by passing the quiz");
  }
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
  });
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    update: { lastPosition: data.position, completed: existing?.completed || data.completed },
    create: { userId: user.id, lessonId: lesson.id, lastPosition: data.position, completed: data.completed },
  });
  const { enrollment } = await recomputeEnrollment(user.id, courseId);
  return { progressPct: enrollment.progressPct, status: enrollment.status };
}

/** Marks a quiz lesson complete for a learner (called when an attempt passes). */
export async function completeQuizLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true },
    create: { userId, lessonId, completed: true },
  });
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
  if (enrolled) await recomputeEnrollment(userId, lesson.module.courseId);
}

export async function courseProgressMap(userId: string, courseId: string) {
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { module: { courseId } } },
    select: { lessonId: true, completed: true, lastPosition: true },
  });
  return new Map(rows.map((r) => [r.lessonId, r]));
}

export async function getLessonProgress(userId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
}
