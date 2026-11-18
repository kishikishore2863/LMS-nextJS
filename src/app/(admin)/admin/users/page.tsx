import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listUsers } from "@/server/services/user.service";
import { listTeams } from "@/server/services/team.service";
import { roleSchema } from "@/lib/validators";
import { Badge, Button, ButtonLink, Card, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { CreateUserDialog, ImportUsersDialog, UserRowActions } from "@/components/admin/user-dialogs";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requirePermission("user:manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const role = roleSchema.safeParse(sp.role).data;
  const teamId = typeof sp.teamId === "string" && sp.teamId ? sp.teamId : undefined;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [{ items, total, nextCursor }, teams] = await Promise.all([listUsers({ q, role, teamId, cursor, limit: 20 }), listTeams()]);
  const qs = (extra: Record<string, string | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ q, role, teamId, ...extra }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Users"
        description={`${total} user${total === 1 ? "" : "s"}`}
        actions={<><ImportUsersDialog /><CreateUserDialog teams={teams.map((t) => ({ id: t.id, name: t.name }))} /></>}
      />
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-border p-4" role="search">
          <Input name="q" defaultValue={q} placeholder="Search name or email" className="max-w-xs" aria-label="Search" />
          <Select name="role" defaultValue={role ?? ""} className="w-36" aria-label="Role">
            <option value="">All roles</option><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="LEARNER">Learner</option>
          </Select>
          <Select name="teamId" defaultValue={teamId ?? ""} className="w-44" aria-label="Team">
            <option value="">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        <DataTable
          data={items}
          rowKey={(u) => u.id}
          empty="No users match"
          columns={[
            {
              header: "User",
              cell: (u) => (
                <Link href={`/admin/users/${u.id}`} className="block hover:text-primary">
                  <span className="font-medium">{u.name}</span>
                  <span className="block text-xs text-muted">{u.email}</span>
                </Link>
              ),
            },
            { header: "Teams", cell: (u) => <span className="text-muted">{u.teams.map((t) => t.team.name).join(", ") || "—"}</span> },
            { header: "Courses", cell: (u) => u._count.enrollments, className: "text-right" },
            { header: "Status", cell: (u) => (u.isActive ? <Badge tone="success">active</Badge> : <Badge tone="danger">inactive</Badge>) },
            { header: "Joined", cell: (u) => <span className="text-muted">{formatDate(u.createdAt)}</span> },
            { header: "Actions", className: "text-right", cell: (u) => <UserRowActions id={u.id} role={u.role} isActive={u.isActive} self={u.id === actor.id} /> },
          ]}
          footer={
            (cursor || nextCursor) && (
              <div className="flex justify-between">
                {cursor ? <ButtonLink variant="secondary" href={`/admin/users${qs({})}`}>First page</ButtonLink> : <span />}
                {nextCursor && <ButtonLink variant="secondary" href={`/admin/users${qs({ cursor: nextCursor })}`}>Next page</ButtonLink>}
              </div>
            )
          }
        />
      </Card>
    </>
  );
}
