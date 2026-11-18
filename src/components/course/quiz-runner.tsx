"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Alert, Button, Card, Textarea } from "@/components/ui";

type Question = { id: string; text: string; type: string; options: string[]; points: number };
type Result = { score: number | null; passed: boolean | null; needsReview: boolean; autoScore: number; attemptsLeft: number };

/** Renders questions (answers never reach the client) and submits for server-side grading. */
export function QuizRunner({
  quiz,
  locked,
  backHref,
}: {
  quiz: { id: string; passPct: number; questions: Question[] };
  locked: "passed" | "review" | "exhausted" | null;
  backHref: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const unanswered = quiz.questions.filter((q) => answers[q.id] === undefined || answers[q.id] === "").length;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "Submission failed");
      setResult(body.data);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const Icon = result.needsReview ? Clock : result.passed ? CheckCircle2 : XCircle;
    const tone = result.needsReview ? "text-warning" : result.passed ? "text-success" : "text-danger";
    return (
      <Card className="p-8 text-center">
        <Icon className={`mx-auto size-12 ${tone}`} aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">
          {result.needsReview ? "Submitted for review" : result.passed ? `Passed with ${result.score}%` : `Scored ${result.score}% — not passed`}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {result.needsReview
            ? `Your manager will grade the written answers. Auto-graded part: ${result.autoScore}%.`
            : result.passed
              ? "Nice work — this lesson is now complete."
              : result.attemptsLeft > 0
                ? `You need ${quiz.passPct}% to pass. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} left.`
                : "You have no attempts left. Contact your manager."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!result.passed && !result.needsReview && result.attemptsLeft > 0 && (
            <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); }}>Try again</Button>
          )}
          <Link href={backHref} className="inline-flex items-center rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white">Back to course</Link>
        </div>
      </Card>
    );
  }

  if (locked) {
    const msg = {
      passed: "You've passed this quiz.",
      review: "Your last attempt is awaiting review by your manager.",
      exhausted: "You have used all attempts for this quiz.",
    }[locked];
    return <Alert tone={locked === "passed" ? "success" : "primary"}>{msg}</Alert>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {quiz.questions.map((q, i) => (
        <Card key={q.id} className="p-5">
          <fieldset>
            <legend className="font-medium">
              {i + 1}. {q.text} <span className="text-xs font-normal text-muted">({q.points} pt{q.points === 1 ? "" : "s"})</span>
            </legend>
            <div className="mt-3 space-y-2">
              {q.type === "SHORT" ? (
                <Textarea rows={3} value={String(answers[q.id] ?? "")} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} aria-label={`Answer to question ${i + 1}`} />
              ) : (
                q.options.map((opt, j) => {
                  const value = q.type === "TRUE_FALSE" ? j === 0 : j;
                  return (
                    <label key={j} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                      <input type="radio" name={q.id} checked={answers[q.id] === value} onChange={() => setAnswers({ ...answers, [q.id]: value })} />
                      {opt}
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>
        </Card>
      ))}
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{unanswered ? `${unanswered} unanswered` : "All questions answered"}</span>
        <Button type="submit" disabled={submitting || unanswered > 0}>{submitting ? "Submitting…" : "Submit answers"}</Button>
      </div>
    </form>
  );
}
