import "server-only";
import { prisma } from "@/lib/prisma";
import { managedTeamIds, type SessionUser } from "@/server/auth/permissions";
import { teamLearners } from "./team.service";

/** Options for AssignCourseDialog, limited to the actor's scope. */
export async function assignOptions(actor: SessionUser) {
  const teamIds = await managedTeamIds(actor);
  const [courses, teams, learners] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.team.findMany({ where: teamIds ? { id: { in: teamIds } } : undefined, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    teamLearners(teamIds),
  ]);
  return { courses: courses.map((c) => ({ id: c.id, name: c.title })), teams, learners };
}
