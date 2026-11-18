import { Suspense } from "react";
import type { Metadata } from "next";
import { BadgeCheck, XCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { Skeleton } from "@/components/dashboard";
import { verifyCertificate } from "@/server/services/certificate.service";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify certificate" };

export default function VerifyPage({ params }: PageProps<"/verify/[code]">) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
        <Result params={params} />
      </Suspense>
    </div>
  );
}

async function Result({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await verifyCertificate(code).catch(() => null);
  if (!cert) {
    return (
      <Card className="max-w-md p-8 text-center">
        <XCircle className="mx-auto size-10 text-danger" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold">Certificate not found</h1>
        <p className="mt-1 text-sm text-muted">No certificate matches code <code>{code}</code>.</p>
      </Card>
    );
  }
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <BadgeCheck className="mx-auto size-10 text-success" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">Valid certificate</h1>
      <dl className="mt-5 space-y-2 text-left text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted">Learner</dt><dd className="font-medium">{cert.learner}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Course</dt><dd className="font-medium text-right">{cert.course}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Issued</dt><dd>{formatDate(cert.issuedAt)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Code</dt><dd><code>{cert.code}</code></dd></div>
      </dl>
      <a href={cert.pdfUrl} className="mt-6 inline-block text-sm font-medium text-primary">Download PDF</a>
    </Card>
  );
}
