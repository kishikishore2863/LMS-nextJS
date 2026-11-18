import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listTeams } from "@/server/services/team.service";
import { listUsers } from "@/server/services/user.service";
import { Badge, Card, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { DeleteTeamButton, TeamDialog } from "@/components/admin/team-dialog";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  await requirePermission("team:manage");
  const [teams, { items: users }] = await Promise.all([listTeams(), listUsers({ limit: 1000 })]);
  const pickable = users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  return (
    <>
      <PageHeader title="Teams" description="Group learners and assign the managers who run their learning." actions={<TeamDialog users={pickable} />} />
      {teams.length === 0 ? (
        <Card><EmptyState title="No teams yet" description="Create a team, then add managers and members." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-sm text-muted">{t.members.length} member{t.members.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex">
                  <TeamDialog
                    users={pickable}
                    team={{ id: t.id, name: t.name, managerIds: t.managers.map((m) => m.userId), memberIds: t.members.map((m) => m.userId) }}
                  />
                  <DeleteTeamButton id={t.id} name={t.name} />
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted">Managers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.managers.length ? t.managers.map((m) => <Badge key={m.userId} tone="warning">{m.user.name}</Badge>) : <span className="text-muted">None assigned</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted">Members</div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.members.slice(0, 14).map((m) => <Badge key={m.userId}>{m.user.name}</Badge>)}
                    {t.members.length > 14 && <Badge>+{t.members.length - 14} more</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
