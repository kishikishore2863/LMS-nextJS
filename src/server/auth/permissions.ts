import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { auth } from "./auth";
import type { Role } from "./roles";
import { hasPermission, type Permission } from "./policy";

export type SessionUser = { id: string; role: Role; name?: string | null; email?: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return null;
  return { id: session.user.id, role: session.user.role, name: session.user.name, email: session.user.email };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requirePermission(p: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, p)) throw new ForbiddenError(p);
  return user;
}

/** Team ids an actor manages. Admins are unscoped (null = all teams). */
export async function managedTeamIds(actor: SessionUser): Promise<string[] | null> {
  if (actor.role === "ADMIN") return null;
  if (actor.role !== "MANAGER") return [];
  const rows = await prisma.teamManager.findMany({ where: { userId: actor.id }, select: { teamId: true } });
  return rows.map((r) => r.teamId);
}

/** Scope check: a manager may only touch learners in their own teams. */
export async function assertLearnerInScope(actor: SessionUser, learnerId: string) {
  if (actor.role === "ADMIN") return;
  if (actor.role === "LEARNER") {
    if (actor.id === learnerId) return;
    throw new ForbiddenError("out_of_scope");
  }
  const ok = await prisma.teamMember.findFirst({
    where: { userId: learnerId, team: { managers: { some: { userId: actor.id } } } },
  });
  if (!ok) throw new ForbiddenError("out_of_scope");
}

export async function assertLearnersInScope(actor: SessionUser, learnerIds: string[]) {
  if (actor.role === "ADMIN") return;
  const unique = [...new Set(learnerIds)];
  const count = await prisma.teamMember.findMany({
    where: { userId: { in: unique }, team: { managers: { some: { userId: actor.id } } } },
    distinct: ["userId"],
    select: { userId: true },
  });
  if (count.length !== unique.length) throw new ForbiddenError("out_of_scope");
}

export async function assertTeamInScope(actor: SessionUser, teamId: string) {
  if (actor.role === "ADMIN") return;
  const ok = await prisma.teamManager.findUnique({ where: { teamId_userId: { teamId, userId: actor.id } } });
  if (!ok) throw new ForbiddenError("out_of_scope");
}
