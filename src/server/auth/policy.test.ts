import { describe, expect, it } from "vitest";
import { PERMISSIONS, hasPermission, type Permission } from "./policy";
import { canAccessPath, viewsFor } from "./roles";

describe("permission matrix (section 3)", () => {
  const expected: Record<Permission, [boolean, boolean, boolean]> = {
    //                     ADMIN  MANAGER LEARNER
    "user:manage":        [true,  false,  false],
    "team:manage":        [true,  false,  false],
    "course:write":       [true,  false,  false],
    "assignment:create":  [true,  true,   false],
    "progress:read:team": [true,  true,   false],
    "review:grade":       [true,  true,   false],
    "report:export":      [true,  true,   false],
    "audit:read":         [true,  false,  false],
    "settings:manage":    [true,  false,  false],
    "course:take":        [true,  true,   true],
  };

  for (const p of Object.keys(PERMISSIONS) as Permission[]) {
    it(`${p}`, () => {
      const [a, m, l] = expected[p];
      expect(hasPermission("ADMIN", p)).toBe(a);
      expect(hasPermission("MANAGER", p)).toBe(m);
      expect(hasPermission("LEARNER", p)).toBe(l);
    });
  }
});

describe("route guards (proxy layer)", () => {
  it("admin can open every dashboard", () => {
    for (const p of ["/admin", "/admin/users", "/manager", "/learner/catalog"]) expect(canAccessPath("ADMIN", p)).toBe(true);
  });
  it("manager is blocked from /admin but can learn", () => {
    expect(canAccessPath("MANAGER", "/admin")).toBe(false);
    expect(canAccessPath("MANAGER", "/admin/users")).toBe(false);
    expect(canAccessPath("MANAGER", "/manager/team")).toBe(true);
    expect(canAccessPath("MANAGER", "/learner")).toBe(true);
  });
  it("learner only reaches /learner", () => {
    expect(canAccessPath("LEARNER", "/admin")).toBe(false);
    expect(canAccessPath("LEARNER", "/manager")).toBe(false);
    expect(canAccessPath("LEARNER", "/learner/courses/x")).toBe(true);
  });
  it("prefix match does not leak into look-alike paths", () => {
    expect(canAccessPath("LEARNER", "/administrator")).toBe(true); // not an /admin route
  });
  it("role switcher views", () => {
    expect(viewsFor("ADMIN")).toEqual(["ADMIN", "MANAGER", "LEARNER"]);
    expect(viewsFor("MANAGER")).toEqual(["MANAGER", "LEARNER"]);
    expect(viewsFor("LEARNER")).toEqual(["LEARNER"]);
  });
});
