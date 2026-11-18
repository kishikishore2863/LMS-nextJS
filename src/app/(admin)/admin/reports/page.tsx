import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { adminStats } from "@/server/services/analytics.service";
import { PageHeader } from "@/components/ui";
import { ReportLinks } from "@/components/shared/report-links";
import { ChartCard } from "@/components/dashboard/chart-card";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requirePermission("report:export");
  const stats = await adminStats("90d");
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export organisation-wide data as CSV." />
      <ReportLinks scope="whole organisation" />
      <ChartCard
        title="Enrolments vs completions"
        subtitle="Weekly, last 90 days"
        type="bar"
        data={stats.trend}
        xKey="label"
        series={[
          { key: "enrolments", label: "Enrolments", color: "var(--chart-1)" },
          { key: "completions", label: "Completions", color: "var(--chart-2)" },
        ]}
      />
    </div>
  );
}
