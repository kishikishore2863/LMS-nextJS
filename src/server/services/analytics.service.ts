import "server-only";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";
import { pct } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import { managedTeamIds, type SessionUser } from "@/server/auth/permissions";

const TTL = 60;
export type Range = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
export function parseRange(r: unknown): Range {
  return r === "7d" || r === "90d" ? r : "30d";
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

// ---------------- Admin ----------------

export function adminStats(range: Range) {
  return cached(`stats:admin:${range}`, TTL, async () => {
    const since = daysAgo(RANGE_DAYS[range]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [users, active, courses, enrolTotal, enrolDone, certsMonth] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.lessonProgress.findMany({ where: { updatedAt: { gte: since } }, distinct: ["userId"], select: { userId: true } }),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: "COMPLETED" } }),
      prisma.certificate.count({ where: { issuedAt: { gte: monthStart } } }),
    ]);

    const bucket = range === "90d" ? "week" : "day";
    const trendRows = await prisma.$queryRaw<{ bucket: Date; enrolments: bigint; completions: bigint }[]>`
      WITH buckets AS (
        SELECT generate_series(date_trunc(${bucket}, ${since}::timestamp), date_trunc(${bucket}, now()), ('1 ' || ${bucket})::interval) AS bucket
      )
      SELECT b.bucket,
        (SELECT COUNT(*) FROM "Enrollment" e WHERE date_trunc(${bucket}, e."createdAt") = b.bucket) AS enrolments,
        (SELECT COUNT(*) FROM "Enrollment" e WHERE date_trunc(${bucket}, e."completedAt") = b.bucket) AS completions
      FROM buckets b ORDER BY b.bucket`;

    const byTeam = await prisma.$queryRaw<{ team: string; rate: Prisma.Decimal | null; total: bigint }[]>`
      SELECT t.name AS team,
             ROUND(100.0 * COUNT(*) FILTER (WHERE e.status = 'COMPLETED') / NULLIF(COUNT(*),0)) AS rate,
             COUNT(*) AS total
        FROM "Enrollment" e
        JOIN "TeamMember" tm ON tm."userId" = e."userId"
        JOIN "Team" t ON t.id = tm."teamId"
       GROUP BY t.name ORDER BY rate DESC NULLS LAST`;

    const top = await prisma.enrollment.groupBy({
      by: ["courseId"],
      _count: { _all: true },
      orderBy: { _count: { courseId: "desc" } },
      take: 10,
    });
    const topCourses = await prisma.course.findMany({ where: { id: { in: top.map((t) => t.courseId) } }, select: { id: true, title: true } });
    const titles = new Map(topCourses.map((c) => [c.id, c.title]));

    return {
      kpis: {
        users,
        activeLearners: active.length,
        courses,
        completionRate: pct(enrolDone, enrolTotal),
        certificatesThisMonth: certsMonth,
      },
      trend: trendRows.map((r) => ({
        label: new Date(r.bucket).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        enrolments: Number(r.enrolments),
        completions: Number(r.completions),
      })),
      completionByTeam: byTeam.map((r) => ({ team: r.team, rate: Number(r.rate ?? 0), total: Number(r.total) })),
      topCourses: top.map((t) => ({ title: titles.get(t.courseId) ?? "—", enrolments: t._count._all })),
    };
  });
}

export async function adminTables() {
  const [recentSignups, awaitingPublish, overdue] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.course.findMany({
      where: { status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, createdAt: true, _count: { select: { modules: true } } },
    }),
    overdueAssignments(null, 10),
  ]);
  return { recentSignups, awaitingPublish, overdue };
}

export async function overdueAssignments(teamIds: string[] | null, take = 20) {
  return prisma.enrollment.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueDate: { lt: new Date() },
      ...(teamIds ? { user: { teams: { some: { teamId: { in: teamIds } } } } } : {}),
    },
    orderBy: { dueDate: "asc" },
    take,
    include: { user: { select: { id: true, name: true } }, course: { select: { title: true } } },
  });
}

// ---------------- Manager ----------------

async function learnerIdsFor(teamIds: string[] | null) {
  const rows = await prisma.teamMember.findMany({
    where: { ...(teamIds ? { teamId: { in: teamIds } } : {}), user: { isActive: true } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}

export async function managerStats(actor: SessionUser) {
  return cached(`stats:manager:${actor.id}`, TTL, async () => {
    const teamIds = await managedTeamIds(actor);
    const learnerIds = await learnerIdsFor(teamIds);
    const scope = { userId: { in: learnerIds } };
    const now = new Date();
    const [enrolTotal, enrolDone, overdue, avgScore, pendingReviews, byCourse] = await Promise.all([
      prisma.enrollment.count({ where: scope }),
      prisma.enrollment.count({ where: { ...scope, status: "COMPLETED" } }),
      prisma.enrollment.count({ where: { ...scope, status: { not: "COMPLETED" }, dueDate: { lt: now } } }),
      prisma.quizAttempt.aggregate({ where: { ...scope, score: { not: null } }, _avg: { score: true } }),
      prisma.quizAttempt.count({ where: { userId: { in: learnerIds.filter((id) => id !== actor.id) }, needsReview: true } }),
      prisma.enrollment.groupBy({ by: ["courseId", "status"], where: scope, _count: { _all: true } }),
    ]);

    const courseIds = [...new Set(byCourse.map((r) => r.courseId))];
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } });
    const progressByCourse = courses
      .map((c) => {
        const get = (s: string) => byCourse.find((r) => r.courseId === c.id && r.status === s)?._count._all ?? 0;
        return { id: c.id, course: c.title, notStarted: get("NOT_STARTED"), inProgress: get("IN_PROGRESS"), completed: get("COMPLETED") };
      })
      .sort((a, b) => b.notStarted + b.inProgress + b.completed - (a.notStarted + a.inProgress + a.completed));

    const since = daysAgo(56);
    const hours = learnerIds.length
      ? await prisma.$queryRaw<{ week: Date; secs: bigint | null }[]>`
          WITH weeks AS (SELECT generate_series(date_trunc('week', ${since}::timestamp), date_trunc('week', now()), interval '1 week') AS week)
          SELECT w.week, (
            SELECT COALESCE(SUM(CASE WHEN lp.completed THEN l."durationSec" ELSE LEAST(lp."lastPosition", l."durationSec") END), 0)
              FROM "LessonProgress" lp JOIN "Lesson" l ON l.id = lp."lessonId"
             WHERE date_trunc('week', lp."updatedAt") = w.week AND lp."userId" IN (${Prisma.join(learnerIds)})
          ) AS secs
          FROM weeks w ORDER BY w.week`
      : [];

    return {
      kpis: {
        teamSize: learnerIds.length,
        completionRate: pct(enrolDone, enrolTotal),
        overdue,
        avgQuizScore: Math.round(avgScore._avg.score ?? 0),
        pendingReviews,
      },
      progressByCourse,
      weeklyHours: hours.map((h) => ({
        label: new Date(h.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        hours: Math.round((Number(h.secs ?? 0) / 3600) * 10) / 10,
      })),
    };
  });
}

/** At-risk: overdue and not completed, or under 20% with a due date inside 7 days. */
export async function atRiskLearners(actor: SessionUser) {
  const teamIds = await managedTeamIds(actor);
  const now = new Date();
  const soon = new Date(Date.now() + 7 * 86400_000);
  return prisma.enrollment.findMany({
    where: {
      status: { not: "COMPLETED" },
      ...(teamIds ? { user: { teams: { some: { teamId: { in: teamIds } } } } } : { user: { teams: { some: {} } } }),
      OR: [{ dueDate: { lt: now } }, { progressPct: { lt: 20 }, dueDate: { lt: soon } }],
    },
    orderBy: { dueDate: "asc" },
    take: 20,
    include: { user: { select: { id: true, name: true } }, course: { select: { title: true } } },
  });
}

export async function upcomingDue(actor: SessionUser) {
  const teamIds = await managedTeamIds(actor);
  return prisma.enrollment.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueDate: { gte: new Date(), lte: new Date(Date.now() + 14 * 86400_000) },
      ...(teamIds ? { user: { teams: { some: { teamId: { in: teamIds } } } } } : {}),
    },
    orderBy: { dueDate: "asc" },
    take: 10,
    include: { user: { select: { id: true, name: true } }, course: { select: { title: true } } },
  });
}

export async function teamOverview(actor: SessionUser, courseId?: string) {
  const teamIds = await managedTeamIds(actor);
  const learnerIds = await learnerIdsFor(teamIds);
  const users = await prisma.user.findMany({
    where: { id: { in: learnerIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      teams: { select: { team: { select: { name: true } } } },
      enrollments: {
        where: courseId ? { courseId } : undefined,
        select: { status: true, progressPct: true, dueDate: true, course: { select: { title: true } } },
      },
    },
  });
  const now = Date.now();
  return users.map((u) => {
    const total = u.enrollments.length;
    const completed = u.enrollments.filter((e) => e.status === "COMPLETED").length;
    const overdue = u.enrollments.filter((e) => e.status !== "COMPLETED" && e.dueDate && e.dueDate.getTime() < now).length;
    const avg = total ? Math.round(u.enrollments.reduce((s, e) => s + e.progressPct, 0) / total) : 0;
    return { id: u.id, name: u.name, email: u.email, teams: u.teams.map((t) => t.team.name), total, completed, overdue, avgProgress: avg, enrollments: u.enrollments };
  });
}

export async function learnerDrilldown(learnerId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: learnerId },
    select: {
      id: true,
      name: true,
      email: true,
      teams: { select: { team: { select: { name: true } } } },
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: { course: { select: { id: true, title: true } } },
      },
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, score: true, passed: true, needsReview: true, createdAt: true, quiz: { select: { lesson: { select: { title: true } } } } },
      },
      certificates: { include: { course: { select: { title: true } } } },
    },
  });
}

// ---------------- Learner ----------------

export function learnerDashboard(userId: string) {
  return cached(`stats:learner:${userId}`, TTL, async () => {
    const [enrollments, certificates, last, activity, passed] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId, course: { status: { not: "DRAFT" } } },
        include: { course: { select: { id: true, title: true, slug: true, categoryId: true, durationMin: true, description: true } } },
      }),
      prisma.certificate.findMany({ where: { userId }, orderBy: { issuedAt: "desc" }, include: { course: { select: { title: true } } } }),
      prisma.lessonProgress.findFirst({
        where: { userId, lesson: { module: { course: { status: "PUBLISHED" } } } },
        orderBy: { updatedAt: "desc" },
        include: { lesson: { select: { id: true, title: true, type: true, module: { select: { course: { select: { id: true, slug: true, title: true } } } } } } },
      }),
      prisma.$queryRaw<{ d: Date }[]>`
        SELECT DISTINCT date_trunc('day', "updatedAt") AS d FROM "LessonProgress" WHERE "userId" = ${userId}
        UNION SELECT DISTINCT date_trunc('day', "createdAt") FROM "QuizAttempt" WHERE "userId" = ${userId}
        ORDER BY d DESC LIMIT 60`,
      prisma.quizAttempt.findMany({
        where: { userId, passed: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, score: true, createdAt: true, quiz: { select: { lesson: { select: { title: true } } } } },
      }),
    ]);

    const enrolledIds = new Set(enrollments.map((e) => e.courseId));
    const doneCats = [...new Set(enrollments.filter((e) => e.status === "COMPLETED").map((e) => e.course.categoryId).filter(Boolean))] as string[];
    let recommended = await prisma.course.findMany({
      where: { status: "PUBLISHED", id: { notIn: [...enrolledIds] }, ...(doneCats.length ? { categoryId: { in: doneCats } } : {}) },
      take: 3,
      orderBy: { publishedAt: "desc" },
      include: { category: true },
    });
    if (recommended.length === 0 && doneCats.length) {
      recommended = await prisma.course.findMany({
        where: { status: "PUBLISHED", id: { notIn: [...enrolledIds] } },
        take: 3,
        orderBy: { publishedAt: "desc" },
        include: { category: true },
      });
    }

    const lastCourse = last?.lesson.module.course;
    const lastEnrollment = lastCourse ? enrollments.find((e) => e.courseId === lastCourse.id) : undefined;

    const achievements = [
      ...certificates.map((c) => ({ kind: "certificate" as const, title: `Certificate: ${c.course.title}`, at: c.issuedAt })),
      ...passed.map((p) => ({ kind: "quiz" as const, title: `Passed "${p.quiz.lesson.title}" (${p.score}%)`, at: p.createdAt })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 5);

    return {
      continueLearning:
        last && lastCourse && lastEnrollment?.status !== "COMPLETED"
          ? {
              courseTitle: lastCourse.title,
              lessonTitle: last.lesson.title,
              progressPct: lastEnrollment?.progressPct ?? 0,
              href:
                last.lesson.type === "QUIZ"
                  ? `/learner/courses/${lastCourse.slug}/lessons/${last.lesson.id}`
                  : `/learner/courses/${lastCourse.slug}/lessons/${last.lesson.id}?t=${last.lastPosition}`,
            }
          : null,
      kpis: {
        inProgress: enrollments.filter((e) => e.status === "IN_PROGRESS").length,
        completed: enrollments.filter((e) => e.status === "COMPLETED").length,
        certificates: certificates.length,
        streak: streakFrom(activity.map((a) => new Date(a.d))),
      },
      assigned: enrollments
        .filter((e) => e.source === "ASSIGNED" && e.status !== "COMPLETED")
        .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
        .map((e) => ({ id: e.id, title: e.course.title, slug: e.course.slug, dueDate: e.dueDate, progressPct: e.progressPct, status: e.status })),
      recommended: recommended.map((c) => ({ id: c.id, title: c.title, slug: c.slug, description: c.description, durationMin: c.durationMin, category: c.category?.name ?? null })),
      achievements,
    };
  });
}

/** Consecutive active days ending today (or yesterday). */
export function streakFrom(days: Date[], today = new Date()) {
  const keys = new Set(days.map((d) => d.toISOString().slice(0, 10)));
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!keys.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (keys.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
