import { describe, expect, it } from "vitest";
import { gradeAnswers } from "./grading";

const qs = [
  { id: "a", type: "MCQ", answer: 1, points: 1 },
  { id: "b", type: "TRUE_FALSE", answer: false, points: 1 },
  { id: "c", type: "MCQ", answer: 0, points: 2 },
];

describe("gradeAnswers (Flow C)", () => {
  it("scores all-correct as 100 and passes", () => {
    expect(gradeAnswers(qs, { a: 1, b: false, c: 0 }, 70)).toEqual({ score: 100, passed: true, needsReview: false });
  });
  it("weights by points", () => {
    expect(gradeAnswers(qs, { a: 1, b: true, c: 1 }, 70).score).toBe(25);
    expect(gradeAnswers(qs, { a: 0, b: true, c: 0 }, 50)).toEqual({ score: 50, passed: true, needsReview: false });
  });
  it("fails below the pass mark", () => {
    expect(gradeAnswers(qs, { a: 1, b: false }, 70)).toEqual({ score: 50, passed: false, needsReview: false });
  });
  it("accepts string forms of answers from JSON", () => {
    expect(gradeAnswers(qs, { a: "1", b: "false", c: "0" }, 70).score).toBe(100);
  });
  it("flags short answers for manual review and never auto-passes", () => {
    const r = gradeAnswers([...qs, { id: "d", type: "SHORT", answer: "", points: 1 }], { a: 1, b: false, c: 0, d: "text" }, 70);
    expect(r.needsReview).toBe(true);
    expect(r.passed).toBe(false);
  });
  it("handles empty quizzes", () => {
    expect(gradeAnswers([], {}, 70)).toEqual({ score: 0, passed: false, needsReview: false });
  });
});
