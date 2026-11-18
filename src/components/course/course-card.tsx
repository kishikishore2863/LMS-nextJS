import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { ProgressBar } from "@/components/dashboard";
import { formatDate, isPast } from "@/lib/utils";

export function CourseCard({
  course,
  progressPct,
  dueDate,
  href,
  action,
}: {
  course: { title: string; description?: string; durationMin?: number; category?: string | null };
  progressPct?: number | null;
  dueDate?: Date | string | null;
  href: string;
  action?: React.ReactNode;
}) {
  const overdue = isPast(dueDate) && (progressPct ?? 0) < 100;
  return (
    <Card className="flex flex-col p-4 transition hover:border-primary/40">
      <div className="mb-3 h-24 rounded-lg bg-gradient-to-br from-primary/80 to-primary/30" aria-hidden />
      <div className="flex items-center gap-2 text-xs text-muted">
        {course.category && <Badge tone="primary">{course.category}</Badge>}
        {course.durationMin ? (
          <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden />{course.durationMin} min</span>
        ) : null}
      </div>
      <Link href={href} className="mt-2 font-semibold leading-snug hover:text-primary">{course.title}</Link>
      {course.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{course.description}</p>}
      <div className="mt-auto space-y-2 pt-4">
        {dueDate && (
          <p className={overdue ? "text-xs font-medium text-danger" : "text-xs text-muted"}>
            {overdue ? "Overdue · " : "Due "}{formatDate(dueDate)}
          </p>
        )}
        {progressPct !== undefined && progressPct !== null && <ProgressBar value={progressPct} />}
        {action}
      </div>
    </Card>
  );
}
