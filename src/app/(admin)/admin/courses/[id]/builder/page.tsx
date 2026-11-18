import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/permissions";
import { getCourseForBuilder, listCategories } from "@/server/services/course.service";
import { NotFoundError } from "@/lib/errors";
import { CourseBuilder } from "@/components/admin/course-builder";

export default async function BuilderPage({ params }: PageProps<"/admin/courses/[id]/builder">) {
  await requirePermission("course:write");
  const { id } = await params;
  const [course, categories] = await Promise.all([
    getCourseForBuilder(id).catch((e) => (e instanceof NotFoundError ? notFound() : Promise.reject(e))),
    listCategories(),
  ]);
  return (
    <CourseBuilder
      key={course.id}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      course={{
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        categoryId: course.categoryId,
        status: course.status,
        durationMin: course.durationMin,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            type: l.type,
            contentUrl: l.contentUrl,
            body: l.body,
            durationSec: l.durationSec,
            quiz: l.quiz
              ? {
                  id: l.quiz.id,
                  passPct: l.quiz.passPct,
                  maxAttempts: l.quiz.maxAttempts,
                  questions: l.quiz.questions.map((q) => ({ id: q.id, text: q.text, type: q.type, options: q.options as string[], answer: q.answer as unknown, points: q.points })),
                }
              : null,
          })),
        })),
      }}
    />
  );
}
