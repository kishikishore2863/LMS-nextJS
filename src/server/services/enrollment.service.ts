import "server-only";
import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/cache";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assignmentSchema } from "@/lib/validators";
import type { Prisma } from "@/generated/prisma/client";
import { assertLearnersInScope, assertTeamInScope, type SessionUser } from "@/server/auth/permissions";
import { enqueue } from "@/server/jobs/queue";
import { audit } from "./audit.service";
import type { z } from "zod";

type Db = Prisma.TransactionClient | typeof prisma;

export async function invalidateStats(learnerIds: string[]) {
  const managers = await prisma.teamManager.findMany({
    where: { team: { members: { some: { userId: { in: learnerIds } } } } },
    select: { userId: true },
  });
  await cacheDel(
    "stats:admin:7d",
    "stats:admin:30d",
    "stats:admin:90d",
    ...learnerIds.map((id) => `stats:learner:${id}`),
    ...[...new Set(managers.map((m) => m.userId))].map((id) => `stats:manager:${id}`),
  );
}

export async function selfEnroll(user: SessionUser, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") throw new NotFoundError("Course");
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: {},
    create: { userId: user.id, courseId, source: "SELF" },
  });
  await invalidateStats([user.id]);
  return { enrollment, slug: course.slug };
}

/**
 * Flow A — assign a course to learners or a whole team.
 * Upserts one enrolment per learner (an existing self-enrolment becomes ASSIGNED).
 */
export async function assignCourse(actor: SessionUser, input: z.input<typeof assignmentSchema>) {
  const data = assignmentSchema.parse(input);
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course || course.status !== "PUBLISHED") throw new ValidationError("Only published courses can be assigned");

  let learnerIds = data.userIds ?? [];
  if (data.teamId) {
    await assertTeamInScope(actor, data.teamId);
    const members = await prisma.teamMember.findMany({ where: { teamId: data.teamId, user: { isActive: true } }, select: { userId: true } });
    learnerIds = [...new Set([...learnerIds, ...members.map((m) => m.userId)])];
  }
  if (learnerIds.length === 0) throw new ValidationError("No learners to assign");
  await assertLearnersInScope(actor, learnerIds);

  const dueDate = data.dueDate ?? null;
  if (dueDate && dueDate.getTime() < Date.now() - 86400_000) throw new ValidationError("Due date is in the past");

  await prisma.$transaction(async (tx) => {
    for (const userId of learnerIds) {
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: course.id } },
        update: { source: "ASSIGNED", assignedBy: actor.id, dueDate },
        create: { userId, courseId: course.id, source: "ASSIGNED", assignedBy: actor.id, dueDate },
      });
    }
    await audit(actor.id, "assignment.create", "Course", course.id, {
      learnerCount: learnerIds.length,
      teamId: data.teamId ?? null,
      dueDate: dueDate?.toISOString() ?? null,
    }, tx);
  });

  await enqueue("notify.assignment", {
    courseId: course.id,
    learnerIds,
    dueDate: dueDate?.toISOString() ?? null,
    assignedBy: actor.id,
  });
  await invalidateStats(learnerIds);
  return { assigned: learnerIds.length };
}

export async function myEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId, course: { status: { not: "DRAFT" } } },
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
    include: { course: { include: { category: true } } },
  });
}

export async function getEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

/**
 * Flow B roll-up: progressPct = completed lessons / total lessons.
 * Quiz lessons only count as completed once passed, so 100% implies all quizzes passed.
 */
export async function recomputeEnrollment(userId: string, courseId: string, db: Db = prisma) {
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) throw new ForbiddenError("not_enrolled");
  const [total, completed, anyProgress] = await Promise.all([
    db.lesson.count({ where: { module: { courseId } } }),
    db.lessonProgress.count({ where: { userId, completed: true, lesson: { module: { courseId } } } }),
    db.lessonProgress.count({ where: { userId, lesson: { module: { courseId } } } }),
  ]);
  const progressPct = total === 0 ? 0 : Math.min(100, Math.round((100 * completed) / total));
  const done = total > 0 && completed >= total;
  const now = new Date();
  const updated = await db.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPct,
      status: done ? "COMPLETED" : anyProgress > 0 ? "IN_PROGRESS" : enrollment.status,
      startedAt: enrollment.startedAt ?? (anyProgress > 0 ? now : null),
      completedAt: done ? (enrollment.completedAt ?? now) : null,
    },
  });
  const justCompleted = done && enrollment.status !== "COMPLETED";
  if (justCompleted) await enqueue("certificate.generate", { userId, courseId });
  if (justCompleted || enrollment.progressPct !== progressPct) await invalidateStats([userId]);
  return { enrollment: updated, justCompleted };
}
