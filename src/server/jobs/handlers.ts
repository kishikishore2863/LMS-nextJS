import "server-only";
import { prisma } from "@/lib/prisma";
import { notify, notifyMany } from "@/server/services/notification.service";
import { issueCertificate } from "@/server/services/certificate.service";
import { sendEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";
import type { JobMap, JobName } from "./types";

/** Job consumers. Run by the BullMQ worker (src/worker) or inline when Redis is not configured. */
export const handlers: { [K in JobName]: (data: JobMap[K]) => Promise<void> } = {
  async "notify.assignment"({ courseId, learnerIds, dueDate }) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true, slug: true } });
    if (!course) return;
    const due = dueDate ? ` — due ${formatDate(dueDate)}` : "";
    await notifyMany(learnerIds, "assignment", `New course assigned: ${course.title}${due}`, `/learner/courses/${course.slug}`);
    const users = await prisma.user.findMany({ where: { id: { in: learnerIds } }, select: { email: true, name: true } });
    for (const u of users) {
      await sendEmail(u.email, `Assigned: ${course.title}`, `Hi ${u.name}, you have been assigned "${course.title}"${due}.`);
    }
  },

  async "certificate.generate"({ userId, courseId }) {
    const cert = await issueCertificate(userId, courseId);
    if (!cert) return;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teams: { include: { team: { include: { managers: true } } } } },
    });
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    if (!user || !course) return;
    await notify(userId, "certificate", `Certificate earned: ${course.title}`, `/learner/certificates`);
    const managerIds = [...new Set(user.teams.flatMap((t) => t.team.managers.map((m) => m.userId)))];
    await notifyMany(managerIds, "completion", `${user.name} completed ${course.title}`, `/manager/team/${userId}`);
    await sendEmail(user.email, `Your certificate for ${course.title}`, `Congratulations! Verify it at /verify/${cert.code}`);
  },

  async "notify.reminders"() {
    const soon = new Date(Date.now() + 3 * 86400_000);
    const due = await prisma.enrollment.findMany({
      where: { status: { not: "COMPLETED" }, dueDate: { lte: soon } },
      include: { course: { select: { title: true, slug: true } } },
    });
    for (const e of due) {
      const overdue = e.dueDate! < new Date();
      await notify(
        e.userId,
        overdue ? "overdue" : "reminder",
        `${overdue ? "Overdue" : "Due soon"}: ${e.course.title} (${formatDate(e.dueDate)})`,
        `/learner/courses/${e.course.slug}`,
      );
    }
  },
};
