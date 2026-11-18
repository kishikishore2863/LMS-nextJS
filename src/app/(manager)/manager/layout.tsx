import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ManagerLayout({ children }: LayoutProps<"/manager">) {
  return <DashboardShell role="MANAGER" allowed={["ADMIN", "MANAGER"]}>{children}</DashboardShell>;
}
