import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui";
import { ReportLinks } from "@/components/shared/report-links";

export const metadata: Metadata = { title: "Team reports" };

export default async function ManagerReportsPage() {
  const actor = await requirePermission("report:export");
  return (
    <>
      <PageHeader title="Reports" description="CSV exports limited to learners in your teams." />
      <ReportLinks scope={actor.role === "ADMIN" ? "all teams (admin)" : "your teams only"} />
    </>
  );
}
