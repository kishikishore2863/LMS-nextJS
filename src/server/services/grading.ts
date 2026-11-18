/** Pure grading logic (Flow C) — unit tested in grading.test.ts. */
export type GradableQuestion = {
  id: string;
  type: string; // MCQ | TRUE_FALSE | SHORT
  answer: unknown;
  points: number;
};

export function gradeAnswers(questions: GradableQuestion[], answers: Record<string, unknown>, passPct: number) {
  let earned = 0;
  let possible = 0;
  let needsReview = false;
  for (const q of questions) {
    possible += q.points;
    const given = answers[q.id];
    if (q.type === "SHORT") {
      needsReview = true;
      continue;
    }
    if (q.type === "MCQ" && given !== undefined && Number(given) === Number(q.answer)) earned += q.points;
    if (q.type === "TRUE_FALSE" && given !== undefined && toBool(given) === toBool(q.answer)) earned += q.points;
  }
  const score = possible === 0 ? 0 : Math.round((100 * earned) / possible);
  return { score, passed: !needsReview && score >= passPct, needsReview };
}

function toBool(v: unknown) {
  return v === true || v === "true";
}
