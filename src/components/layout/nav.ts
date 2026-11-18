import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileClock,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  Library,
  Settings,
  UserPlus,
  Users,
  UsersRound,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/server/auth/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/teams", label: "Teams", icon: UsersRound },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/certificates", label: "Certificates", icon: Award },
    { href: "/admin/audit", label: "Audit log", icon: FileClock },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  MANAGER: [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manager/team", label: "My team", icon: UsersRound },
    { href: "/manager/assign", label: "Assign course", icon: UserPlus },
    { href: "/manager/reviews", label: "Reviews", icon: ClipboardCheck },
    { href: "/manager/reports", label: "Reports", icon: BarChart3 },
  ],
  LEARNER: [
    { href: "/learner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/learner/courses", label: "My courses", icon: GraduationCap },
    { href: "/learner/catalog", label: "Catalogue", icon: Library },
    { href: "/learner/certificates", label: "Certificates", icon: Award },
    { href: "/learner/profile", label: "Profile", icon: UserCircle },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", MANAGER: "Manager", LEARNER: "Learner" };
