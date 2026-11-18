import type { Role } from "./roles";

/** Permission matrix (section 3). Pure so it can be unit-tested without a DB. */
export const PERMISSIONS = {
  "user:manage": ["ADMIN"],
  "team:manage": ["ADMIN"],
  "course:write": ["ADMIN"],
  "assignment:create": ["ADMIN", "MANAGER"],
  "progress:read:team": ["ADMIN", "MANAGER"],
  "review:grade": ["ADMIN", "MANAGER"],
  "report:export": ["ADMIN", "MANAGER"],
  "audit:read": ["ADMIN"],
  "settings:manage": ["ADMIN"],
  "course:take": ["ADMIN", "MANAGER", "LEARNER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, p: Permission) {
  return (PERMISSIONS[p] as readonly Role[]).includes(role);
}
