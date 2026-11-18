import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Target, Users } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { atRiskLearners, managerStats, upcomingDue } from "@/server/services/analytics.service";
import { assignOptions } from "@/server/services/assign-options";
import { listPendingReviews } from "@/server/services/quiz.service";
import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiRow, ProgressBar, StatCard, TableCard, TableSkeleton } from "@/components/dashboard";
import { Badge, PageHeader } from "@/components/ui";
import { AssignCourseDialog } from "@/components/manager/assign-course-dialog";
import type { SessionUser } from "@/server/auth/permissions";
import { formatDate, isPast } from "@/lib/utils";

export const metadata: Metadata = { title: "Manager dashboard" };

export default async function ManagerDashboard() {
  const actor = await requirePermission("progress:read:team");
  const [stats, options] = await Promise.all([managerStats(actor), assignOptions(actor)]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team learning"
        description={actor.role === "ADMIN" ? "Viewing all teams (admin)." : "Progress across the teams you manage."}
        actions={<AssignCourseDialog {...options} scope="team" />}
      />
      <KpiRow>
        <StatCard label="Team size" value={stats.kpis.teamSize} icon={Users} />
        <StatCard label="Completion rate" value={`${stats.kpis.completionRate}%`} icon={CheckCircle2} />
        <StatCard label="Overdue" value={stats.kpis.overdue} icon={AlertTriangle} hint="Assignments past due" />
        <StatCard label="Avg quiz score" value={`${stats.kpis.avgQuizScore}%`} icon={Target} />
        <StatCard label="Pending reviews" value={stats.kpis.pendingReviews} icon={ClipboardCheck} />
      </KpiRow>
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <ChartCard
          title="Team progress by course"
          subtitle="Click a bar to see learners on that course"
          type="stackedBar"
          data={stats.progressByCourse}
          xKey="course"
          linkPrefix="/manager/team?course="
          linkKey="id"
          series={[
            { key: "notStarted", label: "Not started", color: "var(--chart-4)" },
            { key: "inProgress", label: "In progress", color: "var(--chart-3)" },
            { key: "completed", label: "Completed", color: "var(--chart-2)" },
          ]}
        />
        <ChartCard
          title="Weekly learning hours"
          subtitle="Last 8 weeks"
          type="bar"
          data={stats.weeklyHours}
          xKey="label"
          unit="h"
          series={[{ key: "hours", label: "Hours", color: "var(--chart-1)" }]}
        />
      </div>
      <Suspense fallback={<div className="grid gap-4 xl:grid-cols-3"><TableSkeleton /><TableSkeleton /><TableSkeleton /></div>}>
        <Tables actor={actor} />
      </Suspense>
    </div>
  );
}

async function Tables({ actor }: { actor: SessionUser }) {
  const [atRisk, reviews, upcoming] = await Promise.all([atRiskLearners(actor), listPendingReviews(actor), upcomingDue(actor)]);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <TableCard
        title="Learners at risk"
        subtitle="Overdue, or under 20% with a due date inside 7 days"
        data={atRisk}
        rowKey={(e) => e.id}
        empty="No one at risk 🎉"
        columns={[
          { header: "Learner", cell: (e) => <Link href={`/manager/team/${e.user.id}`} className="font-medium hover:text-primary">{e.user.name}</Link> },
          { header: "Course", cell: (e) => <span className="line-clamp-1">{e.course.title}</span> },
          { header: "Due", cell: (e) => <span className={isPast(e.dueDate) ? "text-danger" : "text-warning"}>{formatDate(e.dueDate)}</span> },
          { header: "Progress", cell: (e) => <ProgressBar value={e.progressPct} className="w-24" tone="danger" /> },
        ]}
      />
      <TableCard
        title="Pending quiz reviews"
        action={<Link href="/manager/reviews" className="text-xs text-primary">Review queue</Link>}
        data={reviews.slice(0, 8)}
        rowKey={(r) => r.id}
        empty="Nothing to review"
        columns={[
          { header: "Learner", cell: (r) => r.learner.name },
          { header: "Quiz", cell: (r) => <span className="line-clamp-1">{r.lessonTitle}</span> },
          { header: "Submitted", cell: (r) => <span className="text-muted">{formatDate(r.createdAt)}</span> },
        ]}
      />
      <TableCard
        title="Upcoming due dates"
        subtitle="Next 14 days"
        data={upcoming}
        rowKey={(e) => e.id}
        empty="No upcoming deadlines"
        columns={[
          { header: "Learner", cell: (e) => <Link href={`/manager/team/${e.user.id}`} className="hover:text-primary">{e.user.name}</Link> },
          { header: "Course", cell: (e) => <span className="line-clamp-1">{e.course.title}</span> },
          { header: "Due", cell: (e) => <Badge tone="warning">{formatDate(e.dueDate)}</Badge> },
        ]}
      />
    </div>
  );
}
