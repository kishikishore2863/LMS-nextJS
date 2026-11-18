import Link from "next/link";
import { assertLearnerInScope, requirePermission } from "@/server/auth/permissions";
import { learnerDrilldown } from "@/server/services/analytics.service";
import { assignOptions } from "@/server/services/assign-options";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { DataTable, ProgressBar, StatCard } from "@/components/dashboard";
import { AssignCourseDialog } from "@/components/manager/assign-course-dialog";
import { formatDate, formatDateTime, isPast } from "@/lib/utils";

export default async function LearnerDrilldownPage({ params }: PageProps<"/manager/team/[learnerId]">) {
  const actor = await requirePermission("progress:read:team");
  const { learnerId } = await params;
  await assertLearnerInScope(actor, learnerId); // RBAC layer 3: scope check
  const [learner, options] = await Promise.all([learnerDrilldown(learnerId), assignOptions(actor)]);
  const completed = learner.enrollments.filter((e) => e.status === "COMPLETED").length;
  const scored = learner.attempts.filter((a) => a.score !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/manager/team" className="text-sm text-muted hover:text-foreground">← My team</Link>
        <PageHeader
          title={learner.name}
          description={<>{learner.email} · {learner.teams.map((t) => t.team.name).join(", ")}</>}
          actions={<AssignCourseDialog {...options} learners={options.learners.filter((l) => l.id === learner.id)} scope="users" />}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Enrolled" value={learner.enrollments.length} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Avg quiz score" value={`${avg}%`} />
        <StatCard label="Certificates" value={learner.certificates.length} />
      </div>
      <Card>
        <CardHeader title="Courses" />
        <DataTable
          data={learner.enrollments}
          rowKey={(e) => e.id}
          empty="No enrolments"
          columns={[
            { header: "Course", cell: (e) => <span className="font-medium">{e.course.title}</span> },
            { header: "Source", cell: (e) => <Badge tone={e.source === "ASSIGNED" ? "primary" : "neutral"}>{e.source.toLowerCase()}</Badge> },
            { header: "Status", cell: (e) => <Badge tone={e.status === "COMPLETED" ? "success" : e.status === "IN_PROGRESS" ? "warning" : "neutral"}>{e.status.replace("_", " ").toLowerCase()}</Badge> },
            { header: "Progress", cell: (e) => <ProgressBar value={e.progressPct} className="w-36" /> },
            {
              header: "Due",
              cell: (e) => {
                const overdue = e.status !== "COMPLETED" && isPast(e.dueDate);
                return <span className={overdue ? "font-medium text-danger" : ""}>{formatDate(e.dueDate)}{overdue ? " · overdue" : ""}</span>;
              },
            },
            { header: "Completed", cell: (e) => formatDate(e.completedAt) },
          ]}
        />
      </Card>
      <Card>
        <CardHeader title="Quiz attempts" />
        <DataTable
          data={learner.attempts}
          rowKey={(a) => a.id}
          empty="No quiz attempts yet"
          columns={[
            { header: "Quiz", cell: (a) => a.quiz.lesson.title },
            { header: "Score", cell: (a) => (a.needsReview ? <Link href="/manager/reviews"><Badge tone="warning">needs review</Badge></Link> : `${a.score}%`) },
            { header: "Result", cell: (a) => (a.passed ? <Badge tone="success">passed</Badge> : a.passed === false ? <Badge tone="danger">failed</Badge> : "—") },
            { header: "Submitted", cell: (a) => <span className="text-muted">{formatDateTime(a.createdAt)}</span> },
          ]}
        />
      </Card>
    </div>
  );
}
