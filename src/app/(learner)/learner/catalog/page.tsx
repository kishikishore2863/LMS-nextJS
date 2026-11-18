import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { catalog, listCategories } from "@/server/services/course.service";
import { Button, ButtonLink, Card, Input, PageHeader, Select } from "@/components/ui";
import { EmptyState } from "@/components/dashboard";
import { CourseCard } from "@/components/course/course-card";
import { EnrollButton } from "@/components/course/enroll-button";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CatalogPage({ searchParams }: PageProps<"/learner/catalog">) {
  const user = await requirePermission("course:take");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const categoryId = typeof sp.category === "string" && sp.category ? sp.category : undefined;
  const [courses, categories] = await Promise.all([catalog({ q, categoryId, userId: user.id }), listCategories()]);
  return (
    <>
      <PageHeader title="Course catalogue" description={`${courses.length} published course${courses.length === 1 ? "" : "s"}`} />
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Search courses" className="max-w-xs" aria-label="Search courses" />
        <Select name="category" defaultValue={categoryId ?? ""} className="w-48" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {courses.length === 0 ? (
        <Card><EmptyState title="No courses match your search" /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              href={`/learner/courses/${c.slug}`}
              course={{ title: c.title, description: c.description, durationMin: c.durationMin, category: c.category?.name }}
              progressPct={c.enrollment?.progressPct}
              dueDate={c.enrollment?.dueDate}
              action={c.enrollment ? <ButtonLink variant="secondary" className="w-full" href={`/learner/courses/${c.slug}`}>Continue</ButtonLink> : <EnrollButton courseId={c.id} />}
            />
          ))}
        </div>
      )}
    </>
  );
}
