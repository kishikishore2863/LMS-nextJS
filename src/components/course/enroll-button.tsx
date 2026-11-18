"use client";

import { Button } from "@/components/ui";
import { useAction } from "@/components/ui/use-action";
import { enrollAction } from "@/server/actions/learner.actions";

export function EnrollButton({ courseId, className }: { courseId: string; className?: string }) {
  const { pending, error, exec } = useAction();
  return (
    <div className={className}>
      <Button className="w-full" disabled={pending} onClick={() => exec(() => enrollAction(courseId))}>{pending ? "Enrolling…" : "Enrol"}</Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
