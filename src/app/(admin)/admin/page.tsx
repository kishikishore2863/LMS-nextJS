import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Activity, Award, BookOpen, CheckCircle2, Users } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { adminStats, adminTables, parseRange, type Range } from "@/server/services/analytics.service";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ChartSkeleton, KpiRow, StatCard, TableCard, TableSkeleton } from "@/components/dashboard";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requirePermission("user:manage");
  const range = parseRange((await searchParams).range);
  const stats = await adminStats(range); // cached 60 s
  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Everything happening across the organisation." actions={<RangeTabs range={range} />} />
      <KpiRow>
        <StatCard label="Total users" value={stats.kpis.users} icon={Users} />
        <StatCard label="Active learners" value={stats.kpis.activeLearners} icon={Activity} hint={`Last ${range}`} />
        <StatCard label="Published courses" value={stats.kpis.courses} icon={BookOpen} />
        <StatCard label="Completion rate" value={`${stats.kpis.completionRate}%`} icon={CheckCircle2} hint="All enrolments" />
        <StatCard label="Certificates" value={stats.kpis.certificatesThisMonth} icon={Award} hint="Issued this month" />
      </KpiRow>
      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <ChartCard
            title="Enrolments vs completions"
            subtitle={`Last ${range}`}
            type="line"
            data={stats.trend}
            xKey="label"
            series={[
              { key: "enrolments", label: "Enrolments", color: "var(--chart-1)" },
              { key: "completions", label: "Completions", color: "var(--chart-2)" },
            ]}
          />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartCard
            title="Completion rate by team"
            type="bar"
            data={stats.completionByTeam}
            xKey="team"
            unit="%"
            series={[{ key: "rate", label: "Completion %", color: "var(--chart-1)" }]}
          />
        </Suspense>
      </div>
      <ChartCard
        title="Top courses by enrolment"
        type="bar"
        horizontal
        height={Math.max(160, stats.topCourses.length * 44)}
        data={stats.topCourses}
        xKey="title"
        series={[{ key: "enrolments", label: "Enrolments", color: "var(--chart-1)" }]}
      />
      <Suspense fallback={<div className="grid gap-4 xl:grid-cols-3"><TableSkeleton /><TableSkeleton /><TableSkeleton /></div>}>
        <Tables />
      </Suspense>
    </div>
  );
}

function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Date range">
      {(["7d", "30d", "90d"] as const).map((r) => (
        <Link key={r} href={`/admin?range=${r}`} aria-current={r === range ? "true" : undefined}
          className={cn("rounded-md px-3 py-1 text-sm", r === range ? "bg-primary text-white" : "text-muted hover:text-foreground")}>
          {r}
        </Link>
      ))}
    </div>
  );
}

async function Tables() {
  const { recentSignups, awaitingPublish, overdue } = await adminTables();
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <TableCard
        title="Recent sign-ups"
        action={<Link href="/admin/users" className="text-xs text-primary">All users</Link>}
        data={recentSignups}
        rowKey={(u) => u.id}
        columns={[
          { header: "Name", cell: (u) => <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-primary">{u.name}</Link> },
          { header: "Role", cell: (u) => <Badge tone={u.role === "ADMIN" ? "danger" : u.role === "MANAGER" ? "warning" : "neutral"}>{u.role.toLowerCase()}</Badge> },
          { header: "Joined", cell: (u) => <span className="text-muted">{formatDate(u.createdAt)}</span> },
        ]}
      />
      <TableCard
        title="Courses awaiting publish"
        data={awaitingPublish}
        rowKey={(c) => c.id}
        empty="No drafts"
        columns={[
          { header: "Course", cell: (c) => <Link href={`/admin/courses/${c.id}/builder`} className="font-medium hover:text-primary">{c.title}</Link> },
          { header: "Modules", cell: (c) => c._count.modules },
        ]}
      />
      <TableCard
        title="Overdue assignments"
        subtitle="Across the organisation"
        data={overdue}
        rowKey={(e) => e.id}
        empty="Nothing overdue"
        columns={[
          { header: "Learner", cell: (e) => <Link href={`/admin/users/${e.user.id}`} className="hover:text-primary">{e.user.name}</Link> },
          { header: "Course", cell: (e) => <span className="line-clamp-1">{e.course.title}</span> },
          { header: "Due", cell: (e) => <span className="text-danger">{formatDate(e.dueDate)}</span> },
        ]}
      />
    </div>
  );
}
