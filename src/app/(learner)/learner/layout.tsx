import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function LearnerLayout({ children }: LayoutProps<"/learner">) {
  return <DashboardShell role="LEARNER" allowed={["ADMIN", "MANAGER", "LEARNER"]}>{children}</DashboardShell>;
}
