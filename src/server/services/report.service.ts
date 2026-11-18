import "server-only";
import { prisma } from "@/lib/prisma";
import { managedTeamIds, type SessionUser } from "@/server/auth/permissions";

export const REPORT_TYPES = ["team-progress", "course-summary", "quiz-results"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

function csvEscape(v: unknown) {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

/** Builds a CSV report scoped to the actor (admins: everything, managers: own teams). */
export async function buildReport(actor: SessionUser, type: ReportType) {
  const teamIds = await managedTeamIds(actor);
  const userScope = teamIds ? { teams: { some: { teamId: { in: teamIds } } } } : {};

  if (type === "team-progress") {
    const rows = await prisma.enrollment.findMany({
      where: { user: userScope },
      orderBy: [{ user: { name: "asc" } }],
      include: {
        user: { select: { name: true, email: true, teams: { select: { team: { select: { name: true } } } } } },
        course: { select: { title: true } },
      },
    });
    return toCsv(
      ["Learner", "Email", "Teams", "Course", "Source", "Status", "Progress %", "Due date", "Completed at"],
      rows.map((e) => [
        e.user.name,
        e.user.email,
        e.user.teams.map((t) => t.team.name).join("; "),
        e.course.title,
        e.source,
        e.status,
        e.progressPct,
        e.dueDate,
        e.completedAt,
      ]),
    );
  }

  if (type === "quiz-results") {
    const rows = await prisma.quizAttempt.findMany({
      where: { user: userScope },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, quiz: { select: { passPct: true, lesson: { select: { title: true } } } } },
    });
    return toCsv(
      ["Learner", "Email", "Quiz", "Score", "Pass mark", "Passed", "Needs review", "Submitted"],
      rows.map((a) => [a.user.name, a.user.email, a.quiz.lesson.title, a.score, a.quiz.passPct, a.passed, a.needsReview, a.createdAt]),
    );
  }

  const courses = await prisma.course.findMany({
    where: { status: { not: "DRAFT" } },
    include: { enrollments: { where: { user: userScope }, select: { status: true, progressPct: true } } },
  });
  return toCsv(
    ["Course", "Status", "Enrolments", "Completed", "Completion %", "Avg progress %"],
    courses.map((c) => {
      const n = c.enrollments.length;
      const done = c.enrollments.filter((e) => e.status === "COMPLETED").length;
      const avg = n ? Math.round(c.enrollments.reduce((s, e) => s + e.progressPct, 0) / n) : 0;
      return [c.title, c.status, n, done, n ? Math.round((100 * done) / n) : 0, avg];
    }),
  );
}
