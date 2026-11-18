import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileText, HelpCircle, PlayCircle } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { getCourseBySlug } from "@/server/services/course.service";
import { getEnrollment } from "@/server/services/enrollment.service";
import { courseProgressMap } from "@/server/services/progress.service";
import { NotFoundError } from "@/lib/errors";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { ProgressBar } from "@/components/dashboard";
import { EnrollButton } from "@/components/course/enroll-button";
import { formatDate, isPast } from "@/lib/utils";

const ICON = { VIDEO: PlayCircle, PDF: FileText, TEXT: FileText, QUIZ: HelpCircle };

export default async function CoursePage({ params }: PageProps<"/learner/courses/[slug]">) {
  const user = await requirePermission("course:take");
  const { slug } = await params;
  const course = await getCourseBySlug(slug, { allowUnpublished: user.role === "ADMIN" }).catch((e) =>
    e instanceof NotFoundError ? notFound() : Promise.reject(e),
  );
  const [enrollment, progress] = await Promise.all([getEnrollment(user.id, course.id), courseProgressMap(user.id, course.id)]);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const next = lessons.find((l) => !progress.get(l.id)?.completed) ?? lessons[0];
  const overdue = enrollment?.status !== "COMPLETED" && isPast(enrollment?.dueDate);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <Link href="/learner/courses" className="text-sm text-muted hover:text-foreground">← My courses</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {course.category && <Badge tone="primary">{course.category.name}</Badge>}
            {course.status !== "PUBLISHED" && <Badge tone="warning">{course.status.toLowerCase()} preview</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{course.title}</h1>
          <p className="mt-2 text-muted">{course.description}</p>
        </div>
        <div className="space-y-4">
          {course.modules.map((m, mi) => (
            <Card key={m.id}>
              <div className="border-b border-border px-5 py-3">
                <span className="text-xs text-muted">Module {mi + 1}</span>
                <h2 className="font-semibold">{m.title}</h2>
              </div>
              <ul>
                {m.lessons.map((l) => {
                  const Icon = ICON[l.type];
                  const done = progress.get(l.id)?.completed;
                  const inner = (
                    <>
                      {done ? <CheckCircle2 className="size-4 text-success" aria-label="Completed" /> : <Circle className="size-4 text-muted" aria-label="Not completed" />}
                      <Icon className="size-4 text-primary" aria-hidden />
                      <span className="flex-1 text-sm">{l.title}</span>
                      <span className="text-xs text-muted">{l.type === "QUIZ" ? "Quiz" : `${Math.max(1, Math.round(l.durationSec / 60))} min`}</span>
                    </>
                  );
                  return (
                    <li key={l.id} className="border-b border-border last:border-0">
                      {enrollment ? (
                        <Link href={`/learner/courses/${course.slug}/lessons/${l.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-primary-soft/40">{inner}</Link>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-2.5 opacity-70">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      </div>
      <aside>
        <Card className="sticky top-20 space-y-4 p-5">
          <div className="text-sm text-muted">{lessons.length} lessons · {course.durationMin} min</div>
          {enrollment ? (
            <>
              <ProgressBar value={enrollment.progressPct} />
              {enrollment.dueDate && (
                <p className={`text-sm ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                  {overdue ? "Overdue — was due " : "Due "}{formatDate(enrollment.dueDate)}
                </p>
              )}
              {enrollment.status === "COMPLETED" ? (
                <>
                  <Badge tone="success">Completed {formatDate(enrollment.completedAt)}</Badge>
                  <ButtonLink href="/learner/certificates" variant="secondary" className="w-full">View certificate</ButtonLink>
                </>
              ) : (
                next && (
                  <ButtonLink href={`/learner/courses/${course.slug}/lessons/${next.id}`} className="w-full">
                    {enrollment.status === "NOT_STARTED" ? "Start course" : "Continue"}
                  </ButtonLink>
                )
              )}
              <p className="text-xs text-muted">{enrollment.source === "ASSIGNED" ? "Assigned to you" : "Self-enrolled"}</p>
            </>
          ) : course.status === "PUBLISHED" ? (
            <EnrollButton courseId={course.id} />
          ) : (
            <p className="text-sm text-muted">Publish the course to allow enrolment.</p>
          )}
        </Card>
      </aside>
    </div>
  );
}
