import Link from "next/link";
import type { Metadata } from "next";
import { Award, BookOpenCheck, Flame, PlayCircle, Timer, Trophy } from "lucide-react";
import { requirePermission } from "@/server/auth/permissions";
import { learnerDashboard } from "@/server/services/analytics.service";
import { Badge, ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { EmptyState, KpiRow, ProgressBar, StatCard } from "@/components/dashboard";
import { CourseCard } from "@/components/course/course-card";
import { formatDate, isPast } from "@/lib/utils";

export const metadata: Metadata = { title: "My learning" };

export default async function LearnerDashboard() {
  const user = await requirePermission("course:take");
  const data = await learnerDashboard(user.id);
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0] ?? "learner"}`} description="Pick up where you left off." />

      {data.continueLearning ? (
        <Card className="flex flex-wrap items-center gap-5 bg-gradient-to-r from-primary-soft to-card p-5">
          <PlayCircle className="size-10 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Continue learning</p>
            <h2 className="mt-0.5 text-lg font-semibold">{data.continueLearning.courseTitle}</h2>
            <p className="text-sm text-muted">Last viewed: {data.continueLearning.lessonTitle}</p>
            <ProgressBar value={data.continueLearning.progressPct} className="mt-2 max-w-sm" />
          </div>
          <ButtonLink href={data.continueLearning.href}>Resume</ButtonLink>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold">Ready to start something new?</h2>
            <p className="text-sm text-muted">Browse the catalogue and enrol in a course.</p>
          </div>
          <ButtonLink href="/learner/catalog">Browse catalogue</ButtonLink>
        </Card>
      )}

      <KpiRow>
        <StatCard label="In progress" value={data.kpis.inProgress} icon={Timer} />
        <StatCard label="Completed" value={data.kpis.completed} icon={BookOpenCheck} />
        <StatCard label="Certificates" value={data.kpis.certificates} icon={Award} />
        <StatCard label="Learning streak" value={`${data.kpis.streak} day${data.kpis.streak === 1 ? "" : "s"}`} icon={Flame} />
      </KpiRow>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader title="Assigned to you" subtitle="Sorted by due date" action={<Link href="/learner/courses" className="text-xs text-primary">All my courses</Link>} />
          {data.assigned.length === 0 ? (
            <EmptyState title="No assigned courses" description="When your manager assigns a course it shows up here." />
          ) : (
            <ul>
              {data.assigned.map((a) => {
                const overdue = isPast(a.dueDate);
                return (
                  <li key={a.id} className={`flex flex-wrap items-center gap-4 border-b border-border px-5 py-3 last:border-0 ${overdue ? "bg-danger/5" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <Link href={`/learner/courses/${a.slug}`} className="font-medium hover:text-primary">{a.title}</Link>
                      <p className={`text-xs ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                        {a.dueDate ? `${overdue ? "Overdue — was due" : "Due"} ${formatDate(a.dueDate)}` : "No due date"}
                      </p>
                    </div>
                    <ProgressBar value={a.progressPct} className="w-40" tone={overdue ? "danger" : "primary"} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Recent achievements" />
          {data.achievements.length === 0 ? (
            <EmptyState title="No achievements yet" description="Pass a quiz or finish a course to earn one." />
          ) : (
            <ul>
              {data.achievements.map((a, i) => (
                <li key={i} className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm last:border-0">
                  {a.kind === "certificate" ? <Award className="size-4 text-warning" aria-hidden /> : <Trophy className="size-4 text-success" aria-hidden />}
                  <span className="flex-1">{a.title}</span>
                  <span className="text-xs text-muted">{formatDate(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recommended for you</h2>
          <Link href="/learner/catalog" className="text-sm text-primary">Catalogue</Link>
        </div>
        {data.recommended.length === 0 ? (
          <Card><EmptyState title="You're enrolled in everything available" /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recommended.map((c) => (
              <CourseCard key={c.id} course={c} href={`/learner/courses/${c.slug}`} action={<Badge tone="primary">Recommended</Badge>} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
