import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { myEnrollments } from "@/server/services/enrollment.service";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { CourseCard } from "@/components/course/course-card";

export const metadata: Metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const user = await requirePermission("course:take");
  const enrollments = await myEnrollments(user.id);
  const groups = [
    { title: "In progress", items: enrollments.filter((e) => e.status === "IN_PROGRESS") },
    { title: "Not started", items: enrollments.filter((e) => e.status === "NOT_STARTED") },
    { title: "Completed", items: enrollments.filter((e) => e.status === "COMPLETED") },
  ];
  return (
    <>
      <PageHeader title="My courses" description="Everything you're enrolled in." actions={<ButtonLink variant="secondary" href="/learner/catalog">Find more courses</ButtonLink>} />
      {enrollments.length === 0 ? (
        <Card><EmptyState title="You're not enrolled in any courses" action={<ButtonLink href="/learner/catalog">Browse the catalogue</ButtonLink>} /></Card>
      ) : (
        <div className="space-y-8">
          {groups.filter((g) => g.items.length).map((g) => (
            <section key={g.title}>
              <h2 className="mb-3 font-semibold">{g.title} <span className="text-muted">({g.items.length})</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((e) => (
                  <CourseCard
                    key={e.id}
                    href={`/learner/courses/${e.course.slug}`}
                    course={{ title: e.course.title, description: e.course.description, durationMin: e.course.durationMin, category: e.course.category?.name }}
                    progressPct={e.progressPct}
                    dueDate={e.status === "COMPLETED" ? null : e.dueDate}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
