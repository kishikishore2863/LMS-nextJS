import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/permissions";
import { ROLE_HOME, type Role } from "@/server/auth/roles";
import { PageSkeleton, Skeleton } from "@/components/dashboard";
import { ActiveSidebar, Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

/**
 * Sidebar + topbar + role switcher shared by all role layouts.
 * The static frame prerenders; session-dependent parts stream inside <Suspense>.
 */
export function DashboardShell({ role, allowed, children }: { role: Role; allowed: Role[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<Sidebar role={role} />}>
        <ActiveSidebar role={role} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <UserMenu current={role} />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageSkeleton />}>
            <RoleGuard allowed={allowed}>{children}</RoleGuard>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** RBAC layer 2: the layout re-checks the session on the server. */
async function RoleGuard({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return <>{children}</>;
}
