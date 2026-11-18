import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { teamOverview } from "@/server/services/analytics.service";
import { getCourseTitle } from "@/server/services/course.service";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { DataTable, ProgressBar } from "@/components/dashboard";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My team" };

export default async function TeamPage({ searchParams }: PageProps<"/manager/team">) {
  const actor = await requirePermission("progress:read:team");
  const sp = await searchParams;
  const courseId = typeof sp.course === "string" ? sp.course : undefined;
  const [rows, course] = await Promise.all([
    teamOverview(actor, courseId),
    courseId ? getCourseTitle(courseId) : null,
  ]);
  const shown = courseId ? rows.filter((r) => r.total > 0) : rows;
  return (
    <>
      <PageHeader
        title="My team"
        description={course ? <>Learners enrolled in <strong>{course.title}</strong></> : `${rows.length} learners across your teams`}
        actions={courseId ? <ButtonLink variant="secondary" href="/manager/team">Clear course filter</ButtonLink> : undefined}
      />
      <Card>
        <DataTable
          data={shown}
          rowKey={(r) => r.id}
          empty="No learners in your teams yet"
          columns={[
            {
              header: "Learner",
              cell: (r) => (
                <Link href={`/manager/team/${r.id}`} className="block hover:text-primary">
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-muted">{r.email}</span>
                </Link>
              ),
            },
            { header: "Team", cell: (r) => <span className="text-muted">{r.teams.join(", ")}</span> },
            ...(course
              ? [
                  { header: "Status", cell: (r: (typeof rows)[number]) => <Badge tone={r.enrollments[0]?.status === "COMPLETED" ? "success" : r.enrollments[0]?.status === "IN_PROGRESS" ? "warning" : "neutral"}>{r.enrollments[0]?.status.replace("_", " ").toLowerCase()}</Badge> },
                  { header: "Due", cell: (r: (typeof rows)[number]) => formatDate(r.enrollments[0]?.dueDate) },
                ]
              : [
                  { header: "Courses", cell: (r: (typeof rows)[number]) => `${r.completed}/${r.total}`, className: "text-right" },
                ]),
            { header: "Overdue", cell: (r) => (r.overdue ? <Badge tone="danger">{r.overdue}</Badge> : <span className="text-muted">0</span>), className: "text-right" },
            { header: "Avg progress", cell: (r) => <ProgressBar value={r.avgProgress} className="w-40" /> },
          ]}
        />
      </Card>
    </>
  );
}
