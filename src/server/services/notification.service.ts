import "server-only";
import { prisma } from "@/lib/prisma";

export async function notify(userId: string, type: string, title: string, link?: string) {
  return prisma.notification.create({ data: { userId, type, title, link } });
}

export async function notifyMany(userIds: string[], type: string, title: string, link?: string) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, type, title, link })) });
}

export async function listNotifications(userId: string, limit = 20) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
