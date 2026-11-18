import { describe, expect, it, vi } from "vitest";
import { pct, slugify } from "@/lib/utils";
import { toCsv } from "@/server/services/report.service";
import { streakFrom } from "@/server/services/analytics.service";
import { assignmentSchema, progressSchema } from "@/lib/validators";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/server/auth/auth", () => ({ auth: async () => null }));

describe("utils", () => {
  it("slugify", () => {
    expect(slugify("Data Privacy & GDPR!")).toBe("data-privacy-gdpr");
    expect(slugify("  Müller's  Course ")).toBe("mullers-course");
  });
  it("pct guards divide-by-zero", () => {
    expect(pct(1, 0)).toBe(0);
    expect(pct(1, 3)).toBe(33);
  });
});

describe("csv", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], [null, 3]])).toBe('a,b\n"x,y","say ""hi"""\n,3\n');
  });
});

describe("streak", () => {
  const day = (iso: string) => new Date(iso + "T00:00:00Z");
  it("counts consecutive days ending today", () => {
    expect(streakFrom([day("2026-11-18"), day("2026-11-17"), day("2026-11-16"), day("2026-11-14")], day("2026-11-18"))).toBe(3);
  });
  it("allows the streak to end yesterday", () => {
    expect(streakFrom([day("2026-11-17"), day("2026-11-16")], day("2026-11-18"))).toBe(2);
  });
  it("is zero after a gap", () => {
    expect(streakFrom([day("2026-11-15")], day("2026-11-18"))).toBe(0);
  });
});

describe("validators", () => {
  it("assignment needs userIds or teamId", () => {
    expect(assignmentSchema.safeParse({ courseId: "c" }).success).toBe(false);
    expect(assignmentSchema.safeParse({ courseId: "c", teamId: "t" }).success).toBe(true);
    expect(assignmentSchema.safeParse({ courseId: "c", userIds: ["u"] }).success).toBe(true);
  });
  it("progress defaults", () => {
    expect(progressSchema.parse({ lessonId: "l" })).toEqual({ lessonId: "l", position: 0, completed: false });
  });
});
