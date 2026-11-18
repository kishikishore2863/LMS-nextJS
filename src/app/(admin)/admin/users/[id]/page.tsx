import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/permissions";
import { getUserDetail } from "@/server/services/user.service";
import { NotFoundError } from "@/lib/errors";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { DataTable, ProgressBar } from "@/components/dashboard";
import { UserRowActions } from "@/components/admin/user-dialogs";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const actor = await requirePermission("user:manage");
  const { id } = await params;
  const user = await getUserDetail(id).catch((e) => (e instanceof NotFoundError ? notFound() : Promise.reject(e)));
  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        description={<>{user.email} · joined {formatDate(user.createdAt)}</>}
        actions={<UserRowActions id={user.id} role={user.role} isActive={user.isActive} self={user.id === actor.id} />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 text-sm"><div className="text-muted">Role</div><div className="mt-1 font-medium">{user.role}</div></Card>
        <Card className="p-4 text-sm"><div className="text-muted">Member of</div><div className="mt-1 font-medium">{user.teams.map((t) => t.team.name).join(", ") || "—"}</div></Card>
        <Card className="p-4 text-sm"><div className="text-muted">Manages</div><div className="mt-1 font-medium">{user.managedTeams.map((t) => t.team.name).join(", ") || "—"}</div></Card>
      </div>
      <Card>
        <CardHeader title="Enrolments" />
        <DataTable
          data={user.enrollments}
          rowKey={(e) => e.id}
          empty="Not enrolled in any course"
          columns={[
            { header: "Course", cell: (e) => <span className="font-medium">{e.course.title}</span> },
            { header: "Source", cell: (e) => <Badge tone={e.source === "ASSIGNED" ? "primary" : "neutral"}>{e.source.toLowerCase()}</Badge> },
            { header: "Progress", cell: (e) => <ProgressBar value={e.progressPct} className="w-40" /> },
            { header: "Due", cell: (e) => formatDate(e.dueDate) },
            { header: "Completed", cell: (e) => formatDate(e.completedAt) },
          ]}
        />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Quiz attempts" />
          <DataTable
            data={user.attempts}
            rowKey={(a) => a.id}
            empty="No attempts"
            columns={[
              { header: "Quiz", cell: (a) => a.quiz.lesson.title },
              { header: "Score", cell: (a) => (a.needsReview ? <Badge tone="warning">needs review</Badge> : `${a.score}%`) },
              { header: "Result", cell: (a) => (a.passed ? <Badge tone="success">passed</Badge> : a.passed === false ? <Badge tone="danger">failed</Badge> : "—") },
              { header: "When", cell: (a) => <span className="text-muted">{formatDateTime(a.createdAt)}</span> },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Certificates" />
          <DataTable
            data={user.certificates}
            rowKey={(c) => c.id}
            empty="No certificates yet"
            columns={[
              { header: "Course", cell: (c) => c.course.title },
              { header: "Code", cell: (c) => <Link href={`/verify/${c.code}`} className="font-mono text-primary">{c.code}</Link> },
              { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
