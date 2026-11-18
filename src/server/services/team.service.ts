import "server-only";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
import { teamSchema } from "@/lib/validators";
import type { SessionUser } from "@/server/auth/permissions";
import { audit } from "./audit.service";
import type { z } from "zod";

export async function listTeams(teamIds: string[] | null = null) {
  return prisma.team.findMany({
    where: teamIds ? { id: { in: teamIds } } : undefined,
    orderBy: { name: "asc" },
    include: {
      managers: { include: { user: { select: { id: true, name: true, email: true } } } },
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  });
}

export async function saveTeam(actor: SessionUser, input: z.input<typeof teamSchema>, id?: string) {
  const data = teamSchema.parse(input);
  const clash = await prisma.team.findUnique({ where: { name: data.name } });
  if (clash && clash.id !== id) throw new ConflictError(`Team "${data.name}" already exists`);
  const team = await prisma.$transaction(async (tx) => {
    const t = id
      ? await tx.team.update({ where: { id }, data: { name: data.name } })
      : await tx.team.create({ data: { name: data.name } });
    await tx.teamManager.deleteMany({ where: { teamId: t.id } });
    await tx.teamMember.deleteMany({ where: { teamId: t.id } });
    if (data.managerIds.length) {
      await tx.teamManager.createMany({ data: data.managerIds.map((userId) => ({ teamId: t.id, userId })) });
      // Anyone assigned as a manager gets at least the MANAGER role.
      await tx.user.updateMany({ where: { id: { in: data.managerIds }, role: "LEARNER" }, data: { role: "MANAGER" } });
    }
    if (data.memberIds.length) {
      await tx.teamMember.createMany({ data: data.memberIds.map((userId) => ({ teamId: t.id, userId })) });
    }
    await audit(actor.id, id ? "team.update" : "team.create", "Team", t.id, data, tx);
    return t;
  });
  return team;
}

export async function deleteTeam(actor: SessionUser, id: string) {
  await prisma.team.delete({ where: { id } });
  await audit(actor.id, "team.delete", "Team", id);
}

/** Learners (members) across the given teams; null = everyone in any team. */
export async function teamLearners(teamIds: string[] | null) {
  const rows = await prisma.teamMember.findMany({
    where: teamIds ? { teamId: { in: teamIds } } : undefined,
    include: { user: { select: { id: true, name: true, email: true, isActive: true } }, team: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const byUser = new Map<string, { id: string; name: string; email: string; teams: string[] }>();
  for (const r of rows) {
    if (!r.user.isActive) continue;
    const cur = byUser.get(r.userId) ?? { id: r.user.id, name: r.user.name, email: r.user.email, teams: [] };
    cur.teams.push(r.team.name);
    byUser.set(r.userId, cur);
  }
  return [...byUser.values()];
}
