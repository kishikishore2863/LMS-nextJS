export type Role = "ADMIN" | "MANAGER" | "LEARNER";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  LEARNER: "/learner",
};

/** Route-group guards (section 4). Admin may view every dashboard; managers can also learn. */
export const GUARDS: [string, Role[]][] = [
  ["/admin", ["ADMIN"]],
  ["/manager", ["ADMIN", "MANAGER"]],
  ["/learner", ["ADMIN", "MANAGER", "LEARNER"]],
];

export function canAccessPath(role: Role, pathname: string) {
  const rule = GUARDS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  return !rule || rule[1].includes(role);
}

/** Dashboards a role can switch between (role switcher). */
export function viewsFor(role: Role): Role[] {
  if (role === "ADMIN") return ["ADMIN", "MANAGER", "LEARNER"];
  if (role === "MANAGER") return ["MANAGER", "LEARNER"];
  return ["LEARNER"];
}
