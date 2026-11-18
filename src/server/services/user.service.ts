import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { createUserSchema, registerSchema, updateUserSchema } from "@/lib/validators";
import type { Prisma, Role } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/auth/permissions";
import { audit } from "./audit.service";
import type { z } from "zod";

export async function listUsers(opts: { q?: string; role?: Role; teamId?: string; cursor?: string; limit?: number }) {
  const limit = opts.limit ?? 20;
  const where: Prisma.UserWhereInput = {
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.teamId ? { teams: { some: { teamId: opts.teamId } } } : {}),
    ...(opts.q
      ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { email: { contains: opts.q, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        teams: { select: { team: { select: { id: true, name: true } } } },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return { items, total, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teams: { include: { team: true } },
      managedTeams: { include: { team: true } },
      enrollments: { include: { course: { select: { title: true, slug: true } } }, orderBy: { createdAt: "desc" } },
      certificates: { include: { course: { select: { title: true } } } },
      attempts: { include: { quiz: { include: { lesson: { select: { title: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) throw new NotFoundError("User");
  const { passwordHash: _omit, ...safe } = user;
  void _omit;
  return safe;
}

export async function registerUser(input: z.input<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ConflictError("An account with this email already exists");
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, role: "LEARNER" } });
}

/** Creates a user; returns a generated temporary password when none was supplied. */
export async function createUser(actor: SessionUser, input: z.input<typeof createUserSchema>) {
  const data = createUserSchema.parse(input);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ConflictError(`User ${data.email} already exists`);
  const tempPassword = data.password ?? randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash } });
    if (data.teamId) await tx.teamMember.create({ data: { teamId: data.teamId, userId: u.id } });
    await audit(actor.id, "user.create", "User", u.id, { email: u.email, role: u.role }, tx);
    return u;
  });
  return { user, tempPassword: data.password ? undefined : tempPassword };
}

export async function updateUser(actor: SessionUser, id: string, input: z.input<typeof updateUserSchema>) {
  const data = updateUserSchema.parse(input);
  if (id === actor.id && (data.role && data.role !== "ADMIN")) throw new ValidationError("You cannot demote yourself");
  if (id === actor.id && data.isActive === false) throw new ValidationError("You cannot deactivate yourself");
  const user = await prisma.user.update({ where: { id }, data });
  await audit(actor.id, "user.update", "User", id, data);
  return user;
}

/** CSV columns: name,email,role,team — header row optional. Missing teams are created. */
export async function importUsersCsv(actor: SessionUser, csv: string) {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().startsWith("name")) lines.shift();
  const results = { created: 0, skipped: 0, errors: [] as string[] };
  for (const [i, line] of lines.entries()) {
    const [name, email, role = "LEARNER", teamName] = line.split(",").map((s) => s?.trim());
    const parsed = createUserSchema.safeParse({ name, email, role: role.toUpperCase() });
    if (!parsed.success) {
      results.errors.push(`Line ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) {
      results.skipped++;
      continue;
    }
    let teamId: string | undefined;
    if (teamName) {
      const team = await prisma.team.upsert({ where: { name: teamName }, update: {}, create: { name: teamName } });
      teamId = team.id;
    }
    await createUser(actor, { ...parsed.data, password: undefined, teamId });
    results.created++;
  }
  await audit(actor.id, "user.import", "User", "bulk", results);
  return results;
}

export async function getProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true, teams: { select: { team: { select: { name: true } } } } },
  });
}

export async function changePassword(userId: string, current: string, next: string) {
  if (next.length < 8) throw new ValidationError("New password must be at least 8 characters");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.passwordHash && !(await bcrypt.compare(current, user.passwordHash))) {
    throw new ValidationError("Current password is incorrect");
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 10) } });
}

export async function getRoleByEmail(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email }, select: { role: true } });
  return u.role;
}
