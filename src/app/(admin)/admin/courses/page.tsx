import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listCategories, listCoursesAdmin } from "@/server/services/course.service";
import { Badge, Button, Card, Input, PageHeader, Select, type Tone } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { NewCourseDialog } from "@/components/admin/course-forms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Courses" };
const STATUS_TONE: Record<string, Tone> = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" };

export default async function CoursesPage({ searchParams }: PageProps<"/admin/courses">) {
  await requirePermission("course:write");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(sp.status)) ? (sp.status as "DRAFT") : undefined;
  const [courses, categories] = await Promise.all([listCoursesAdmin({ q, status }), listCategories()]);
  return (
    <>
      <PageHeader title="Courses" description="Build, publish and archive courses." actions={<NewCourseDialog categories={categories} />} />
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-border p-4" role="search">
          <Input name="q" defaultValue={q} placeholder="Search courses" className="max-w-xs" aria-label="Search" />
          <Select name="status" defaultValue={status ?? ""} className="w-40" aria-label="Status">
            <option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
          </Select>
          <Button variant="secondary" type="submit">Filter</Button>
        </form>
        <DataTable
          data={courses}
          rowKey={(c) => c.id}
          empty="No courses yet"
          columns={[
            {
              header: "Course",
              cell: (c) => (
                <Link href={`/admin/courses/${c.id}/builder`} className="block hover:text-primary">
                  <span className="font-medium">{c.title}</span>
                  <span className="block text-xs text-muted">{c.category?.name ?? "Uncategorised"} · {c.durationMin} min</span>
                </Link>
              ),
            },
            { header: "Status", cell: (c) => <Badge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase()}</Badge> },
            { header: "Modules", cell: (c) => c._count.modules, className: "text-right" },
            { header: "Enrolments", cell: (c) => c._count.enrollments, className: "text-right" },
            { header: "Published", cell: (c) => <span className="text-muted">{formatDate(c.publishedAt)}</span> },
            { header: "", className: "text-right", cell: (c) => <Link href={`/admin/courses/${c.id}/builder`} className="text-sm text-primary">Open builder</Link> },
          ]}
        />
      </Card>
    </>
  );
}
