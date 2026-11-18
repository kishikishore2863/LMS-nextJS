import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSessionUser } from "@/server/auth/permissions";
import { viewsFor, ROLE_HOME, type Role } from "@/server/auth/roles";
import { listNotifications } from "@/server/services/notification.service";
import { logoutAction } from "@/server/actions/auth.actions";
import { ROLE_LABEL } from "./nav";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";

/** Topbar right side: notifications, role switcher, user + sign out. Reads the session → render inside <Suspense>. */
export async function UserMenu({ current }: { current: Role }) {
  const user = await getSessionUser();
  if (!user) return null;
  const { items, unread } = await listNotifications(user.id, 8);
  const views = viewsFor(user.role);
  return (
    <div className="flex items-center gap-3">
      {views.length > 1 && (
        <div className="hidden items-center rounded-lg border border-border p-0.5 sm:flex" role="group" aria-label="Switch dashboard">
          {views.map((r) => (
            <Link
              key={r}
              href={ROLE_HOME[r]}
              aria-current={r === current ? "page" : undefined}
              className={cn("rounded-md px-2.5 py-1 text-xs font-medium", r === current ? "bg-primary text-white" : "text-muted hover:text-foreground")}
            >
              {ROLE_LABEL[r]}
            </Link>
          ))}
        </div>
      )}
      <NotificationBell
        unread={unread}
        items={items.map((n) => ({ id: n.id, title: n.title, link: n.link, read: !!n.readAt, at: n.createdAt.toISOString() }))}
      />
      <div className="hidden text-right text-sm leading-tight md:block">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted">{user.email}</div>
      </div>
      <form action={logoutAction}>
        <button className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-foreground" aria-label="Sign out" title="Sign out">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
