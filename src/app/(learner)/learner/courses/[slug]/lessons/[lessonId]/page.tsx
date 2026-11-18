import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { getCourseBySlug, getLessonForPlayer } from "@/server/services/course.service";
import { getEnrollment } from "@/server/services/enrollment.service";
import { courseProgressMap } from "@/server/services/progress.service";
import { NotFoundError } from "@/lib/errors";
import { ButtonLink, Card } from "@/components/ui";
import { ProgressBar } from "@/components/dashboard";
import { LessonPlayer } from "@/components/course/lesson-player";
import { cn } from "@/lib/utils";

export default async function LessonPage({ params, searchParams }: PageProps<"/learner/courses/[slug]/lessons/[lessonId]">) {
  const user = await requirePermission("course:take");
  const { slug, lessonId } = await params;
  const sp = await searchParams;
  const nf = (e: unknown) => (e instanceof NotFoundError ? notFound() : Promise.reject(e));
  const [course, lesson] = await Promise.all([
    getCourseBySlug(slug, { allowUnpublished: user.role === "ADMIN" }).catch(nf),
    getLessonForPlayer(lessonId).catch(nf),
  ]);
  if (lesson.module.courseId !== course.id) notFound();
  const enrollment = await getEnrollment(user.id, course.id);
  if (!enrollment) redirect(`/learner/courses/${slug}`);
  const progress = await courseProgressMap(user.id, course.id);

  const lessons = course.modules.flatMap((m) => m.lessons);
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  const t = Number(sp.t);
  const startAt = Number.isFinite(t) && t > 0 ? t : (progress.get(lesson.id)?.lastPosition ?? 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <div>
          <Link href={`/learner/courses/${slug}`} className="text-sm text-muted hover:text-foreground">← {course.title}</Link>
          <h1 className="mt-1 text-xl font-semibold">{lesson.title}</h1>
        </div>
        <LessonPlayer
          key={lesson.id}
          lesson={{ id: lesson.id, type: lesson.type, contentUrl: lesson.contentUrl, body: lesson.body, durationSec: lesson.durationSec, quizId: lesson.quiz?.id ?? null }}
          startAt={startAt}
          completed={!!progress.get(lesson.id)?.completed}
          nextHref={next ? `/learner/courses/${slug}/lessons/${next.id}` : `/learner/courses/${slug}`}
        />
        <div className="flex justify-between">
          {prev ? <ButtonLink variant="secondary" href={`/learner/courses/${slug}/lessons/${prev.id}`}>← Previous</ButtonLink> : <span />}
          {next ? <ButtonLink variant="secondary" href={`/learner/courses/${slug}/lessons/${next.id}`}>Next →</ButtonLink> : <ButtonLink variant="secondary" href={`/learner/courses/${slug}`}>Course overview</ButtonLink>}
        </div>
      </div>
      <aside>
        <Card className="sticky top-20">
          <div className="border-b border-border p-4">
            <ProgressBar value={enrollment.progressPct} />
          </div>
          <nav aria-label="Course lessons" className="max-h-[60vh] overflow-y-auto py-2">
            {course.modules.map((m) => (
              <div key={m.id} className="py-1">
                <div className="px-4 py-1 text-xs font-medium uppercase tracking-wide text-muted">{m.title}</div>
                {m.lessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`/learner/courses/${slug}/lessons/${l.id}`}
                    aria-current={l.id === lesson.id ? "page" : undefined}
                    className={cn("flex items-center gap-2 px-4 py-1.5 text-sm", l.id === lesson.id ? "bg-primary-soft font-medium text-primary" : "hover:bg-primary-soft/40")}
                  >
                    <CheckCircle2 className={cn("size-3.5 shrink-0", progress.get(l.id)?.completed ? "text-success" : "text-border")} aria-hidden />
                    <span className="line-clamp-1">{l.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </Card>
      </aside>
    </div>
  );
}
