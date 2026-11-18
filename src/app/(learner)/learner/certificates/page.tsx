import Link from "next/link";
import type { Metadata } from "next";
import { Award, Download } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { listCertificates } from "@/server/services/certificate.service";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const user = await requirePermission("course:take");
  const certs = await listCertificates(user.id);
  return (
    <>
      <PageHeader title="Certificates" description="Earned automatically when you complete a course." />
      {certs.length === 0 ? (
        <Card><EmptyState title="No certificates yet" description="Complete every lesson and pass the quizzes in a course to earn one." action={<ButtonLink href="/learner/courses">My courses</ButtonLink>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <Award className="size-8 text-warning" aria-hidden />
              <h2 className="mt-3 font-semibold">{c.course.title}</h2>
              <p className="text-sm text-muted">Issued {formatDate(c.issuedAt)}</p>
              <p className="mt-1 text-xs text-muted">ID <code>{c.code}</code></p>
              <div className="mt-4 flex gap-3 text-sm">
                <a href={c.pdfUrl} className="inline-flex items-center gap-1.5 font-medium text-primary"><Download className="size-4" />Download PDF</a>
                <Link href={`/verify/${c.code}`} className="text-muted hover:text-foreground">Verification link</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
