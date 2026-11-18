import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Prisma.InputJsonValue,
  db: Db = prisma,
) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, meta } });
}

export async function listAudit({ cursor, limit = 50, entity }: { cursor?: string; limit?: number; entity?: string }) {
  const rows = await prisma.auditLog.findMany({
    where: entity ? { entity } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const actorIds = [...new Set(rows.map((r) => r.actorId))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const names = new Map(actors.map((a) => [a.id, a.name]));
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((r) => ({ ...r, actorName: names.get(r.actorId) ?? "system" }));
  return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
}
