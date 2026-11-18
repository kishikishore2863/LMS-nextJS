import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listAudit } from "@/server/services/audit.service";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermission("audit:read");
  const sp = await searchParams;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const { items, nextCursor } = await listAudit({ cursor, limit: 50 });
  return (
    <>
      <PageHeader title="Audit log" description="Who did what, when." />
      <Card>
        <DataTable
          data={items}
          rowKey={(r) => r.id}
          empty="No activity yet"
          columns={[
            { header: "When", cell: (r) => <span className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</span> },
            { header: "Actor", cell: (r) => r.actorName },
            { header: "Action", cell: (r) => <Badge tone="primary">{r.action}</Badge> },
            { header: "Entity", cell: (r) => <span className="text-muted">{r.entity} <code className="text-xs">{r.entityId.slice(0, 10)}</code></span> },
            { header: "Details", cell: (r) => <code className="line-clamp-1 max-w-sm text-xs text-muted">{r.meta ? JSON.stringify(r.meta) : ""}</code> },
          ]}
          footer={
            (cursor || nextCursor) && (
              <div className="flex justify-between">
                {cursor ? <ButtonLink variant="secondary" href="/admin/audit">Newest</ButtonLink> : <span />}
                {nextCursor && <ButtonLink variant="secondary" href={`/admin/audit?cursor=${nextCursor}`}>Older</ButtonLink>}
              </div>
            )
          }
        />
      </Card>
    </>
  );
}
