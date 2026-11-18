import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listAllCertificates } from "@/server/services/certificate.service";
import { Card, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  await requirePermission("user:manage");
  const certs = await listAllCertificates(200);
  return (
    <>
      <PageHeader title="Certificates" description="Issued automatically when a learner completes a course." />
      <Card>
        <DataTable
          data={certs}
          rowKey={(c) => c.id}
          empty="No certificates issued yet"
          columns={[
            { header: "Learner", cell: (c) => <><span className="font-medium">{c.user.name}</span><span className="block text-xs text-muted">{c.user.email}</span></> },
            { header: "Course", cell: (c) => c.course.title },
            { header: "Issued", cell: (c) => formatDate(c.issuedAt) },
            { header: "Code", cell: (c) => <Link href={`/verify/${c.code}`} className="font-mono text-primary">{c.code}</Link> },
            { header: "", className: "text-right", cell: (c) => <a href={c.pdfUrl} className="text-sm text-primary">PDF</a> },
          ]}
        />
      </Card>
    </>
  );
}
