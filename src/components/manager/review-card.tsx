"use client";

import { useState } from "react";
import { Alert, Badge, Button, Card, Input } from "@/components/ui";
import { useAction } from "@/components/ui/use-action";
import { gradeAttemptAction } from "@/server/actions/manager.actions";
import { formatDateTime } from "@/lib/utils";

type Item = { id: string; text: string; type: string; options: string[]; expected: unknown; given: unknown; points: number };
type Review = {
  id: string;
  createdAt: string;
  learner: { name: string; email: string };
  lessonTitle: string;
  courseTitle: string;
  passPct: number;
  autoScore: number;
  items: Item[];
};

function show(item: Item, v: unknown) {
  if (v === null || v === undefined || v === "") return <em className="text-muted">No answer</em>;
  if (item.type === "MCQ") return item.options[Number(v)] ?? String(v);
  if (item.type === "TRUE_FALSE") return v === true || v === "true" ? "True" : "False";
  return String(v);
}

export function ReviewCard({ review }: { review: Review }) {
  const [score, setScore] = useState(review.autoScore);
  const { pending, error, exec } = useAction();
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-semibold">{review.lessonTitle}</h2>
          <p className="text-sm text-muted">{review.learner.name} · {review.courseTitle} · {formatDateTime(review.createdAt)}</p>
        </div>
        <Badge tone="warning">Pass mark {review.passPct}%</Badge>
      </div>
      <ol className="space-y-4 p-5">
        {review.items.map((item, i) => {
          const auto = item.type !== "SHORT";
          const correct = auto && String(item.given) === String(item.expected);
          return (
            <li key={item.id} className="text-sm">
              <p className="font-medium">{i + 1}. {item.text} <span className="text-xs font-normal text-muted">({item.points} pt)</span></p>
              <div className="mt-1.5 rounded-lg bg-primary-soft/50 p-3">
                <p><span className="text-muted">Answer: </span>{show(item, item.given)}</p>
                {auto ? (
                  <p className={correct ? "text-success" : "text-danger"}>{correct ? "Correct" : <>Incorrect — expected {show(item, item.expected)}</>}</p>
                ) : (
                  item.expected ? <p className="text-muted">Marking guide: {String(item.expected)}</p> : null
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <form className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3.5" action={() => exec(() => gradeAttemptAction(review.id, score))}>
        {error && <Alert>{error}</Alert>}
        <label className="flex items-center gap-2 text-sm">
          Final score
          <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-24" aria-label="Final score percent" />%
        </label>
        <span className="text-xs text-muted">Auto-graded part: {review.autoScore}% · {score >= review.passPct ? "will pass" : "will not pass"}</span>
        <Button type="submit" disabled={pending} className="ml-auto">{pending ? "Saving…" : "Submit grade"}</Button>
      </form>
    </Card>
  );
}
