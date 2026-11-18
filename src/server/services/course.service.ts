import "server-only";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import {
  courseSchema,
  courseUpdateSchema,
  lessonSchema,
  moduleSchema,
  questionSchema,
  quizSettingsSchema,
} from "@/lib/validators";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/auth/permissions";
import { audit } from "./audit.service";
import { getSettings } from "./settings.service";
import type { z } from "zod";

// ---------- Reads ----------

export async function listCoursesAdmin(opts: { q?: string; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" } = {}) {
  return prisma.course.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q ? { title: { contains: opts.q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      _count: { select: { enrollments: true, modules: true } },
    },
  });
}

export async function catalog(opts: { q?: string; categoryId?: string; userId?: string }) {
  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.q
      ? {
          OR: [
            { title: { contains: opts.q, mode: "insensitive" } },
            { description: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const courses = await prisma.course.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    include: { category: true, _count: { select: { enrollments: true } } },
  });
  const enrolled = opts.userId
    ? await prisma.enrollment.findMany({ where: { userId: opts.userId }, select: { courseId: true, progressPct: true, dueDate: true } })
    : [];
  const byCourse = new Map(enrolled.map((e) => [e.courseId, e]));
  return courses.map((c) => ({ ...c, enrollment: byCourse.get(c.id) ?? null }));
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { courses: true } } } });
}

export async function createCategory(actor: SessionUser, name: string) {
  const n = name.trim();
  if (n.length < 2) throw new ValidationError("Category name is too short");
  const c = await prisma.category.upsert({ where: { name: n }, update: {}, create: { name: n } });
  await audit(actor.id, "category.create", "Category", c.id, { name: n });
  return c;
}

export async function deleteCategory(actor: SessionUser, id: string) {
  await prisma.course.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });
  await audit(actor.id, "category.delete", "Category", id);
}

const builderInclude = {
  category: true,
  modules: {
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { quiz: { include: { questions: true } } },
      },
    },
  },
} satisfies Prisma.CourseInclude;

export async function getCourseForBuilder(id: string) {
  const course = await prisma.course.findUnique({ where: { id }, include: builderInclude });
  if (!course) throw new NotFoundError("Course");
  return course;
}

/** Course outline for learners. Never includes quiz answers. */
export async function getCourseBySlug(slug: string, opts: { allowUnpublished?: boolean } = {}) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      category: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, order: true, durationSec: true, quiz: { select: { id: true } } },
          },
        },
      },
    },
  });
  if (!course || (course.status !== "PUBLISHED" && !opts.allowUnpublished)) throw new NotFoundError("Course");
  return course;
}

export async function getLessonForPlayer(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      type: true,
      contentUrl: true,
      body: true,
      durationSec: true,
      quiz: { select: { id: true } },
      module: { select: { courseId: true, course: { select: { slug: true, title: true, status: true } } } },
    },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  return lesson;
}

export async function getCourseTitle(id: string) {
  return prisma.course.findUnique({ where: { id }, select: { title: true } });
}

// ---------- Course writes ----------

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "course";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.course.findUnique({ where: { slug } });
    if (!clash || clash.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

export async function createCourse(actor: SessionUser, input: z.input<typeof courseSchema>) {
  const data = courseSchema.parse(input);
  const course = await prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId || null,
      thumbnail: data.thumbnail || null,
      slug: await uniqueSlug(data.title),
      createdById: actor.id,
    },
  });
  await audit(actor.id, "course.create", "Course", course.id, { title: course.title });
  return course;
}

export async function updateCourse(actor: SessionUser, id: string, input: z.input<typeof courseUpdateSchema>) {
  const data = courseUpdateSchema.parse(input);
  const existing = await getCourseForBuilder(id);
  const patch: Prisma.CourseUpdateInput = {};
  if (data.title !== undefined && data.title !== existing.title) {
    patch.title = data.title;
    if (existing.status === "DRAFT") patch.slug = await uniqueSlug(data.title, id);
  }
  if (data.description !== undefined) patch.description = data.description;
  if (data.thumbnail !== undefined) patch.thumbnail = data.thumbnail || null;
  if (data.categoryId !== undefined) {
    patch.category = data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true };
  }
  if (data.status && data.status !== existing.status) {
    if (data.status === "PUBLISHED") {
      const lessonCount = existing.modules.reduce((n, m) => n + m.lessons.length, 0);
      if (lessonCount === 0) throw new ValidationError("Add at least one lesson before publishing");
      const emptyQuiz = existing.modules
        .flatMap((m) => m.lessons)
        .find((l) => l.type === "QUIZ" && (!l.quiz || l.quiz.questions.length === 0));
      if (emptyQuiz) throw new ValidationError(`Quiz "${emptyQuiz.title}" has no questions`);
      patch.publishedAt = existing.publishedAt ?? new Date();
    }
    patch.status = data.status;
  }
  const course = await prisma.course.update({ where: { id }, data: patch });
  await audit(actor.id, data.status ? `course.${data.status.toLowerCase()}` : "course.update", "Course", id, data);
  return course;
}

/** Deleting a published course is blocked (archive instead) so learner history is kept. */
export async function deleteCourse(actor: SessionUser, id: string) {
  const course = await prisma.course.findUnique({ where: { id }, include: { _count: { select: { enrollments: true } } } });
  if (!course) throw new NotFoundError("Course");
  if (course.status === "PUBLISHED") throw new ConflictError("Published courses cannot be deleted — archive it instead");
  if (course._count.enrollments > 0) throw new ConflictError("Course has enrolments — archive it instead");
  await prisma.course.delete({ where: { id } });
  await audit(actor.id, "course.delete", "Course", id, { title: course.title });
}

async function recomputeDuration(courseId: string) {
  const agg = await prisma.lesson.aggregate({ where: { module: { courseId } }, _sum: { durationSec: true } });
  await prisma.course.update({ where: { id: courseId }, data: { durationMin: Math.round((agg._sum.durationSec ?? 0) / 60) } });
}

// ---------- Modules ----------

export async function addModule(actor: SessionUser, courseId: string, input: z.input<typeof moduleSchema>) {
  const data = moduleSchema.parse(input);
  const max = await prisma.module.aggregate({ where: { courseId }, _max: { order: true } });
  const mod = await prisma.module.create({ data: { courseId, title: data.title, order: (max._max.order ?? 0) + 1 } });
  await audit(actor.id, "module.create", "Module", mod.id, { courseId, title: data.title });
  return mod;
}

export async function renameModule(actor: SessionUser, id: string, input: z.input<typeof moduleSchema>) {
  const data = moduleSchema.parse(input);
  return prisma.module.update({ where: { id }, data: { title: data.title } });
}

export async function deleteModule(actor: SessionUser, id: string) {
  const mod = await prisma.module.delete({ where: { id } });
  await recomputeDuration(mod.courseId);
  await audit(actor.id, "module.delete", "Module", id);
}

/** Reorders within the @@unique([parent, order]) constraint by parking rows at negative orders first. */
export async function reorderModules(actor: SessionUser, courseId: string, ids: string[]) {
  const current = await prisma.module.findMany({ where: { courseId }, select: { id: true } });
  if (current.length !== ids.length || !current.every((m) => ids.includes(m.id))) {
    throw new ValidationError("Reorder list must contain every module exactly once");
  }
  await prisma.$transaction([
    ...ids.map((id, i) => prisma.module.update({ where: { id }, data: { order: -(i + 1) } })),
    ...ids.map((id, i) => prisma.module.update({ where: { id }, data: { order: i + 1 } })),
  ]);
}

// ---------- Lessons ----------

async function quizDefaults() {
  const s = await getSettings();
  return { passPct: Number(s.defaultPassPct) || 70, maxAttempts: Number(s.defaultMaxAttempts) || 3 };
}

export async function addLesson(actor: SessionUser, moduleId: string, input: z.input<typeof lessonSchema>) {
  const data = lessonSchema.parse(input);
  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) throw new NotFoundError("Module");
  const max = await prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: data.title,
      type: data.type,
      contentUrl: data.contentUrl || null,
      body: data.body || null,
      durationSec: data.durationSec,
      order: (max._max.order ?? 0) + 1,
      ...(data.type === "QUIZ" ? { quiz: { create: await quizDefaults() } } : {}),
    },
  });
  await recomputeDuration(mod.courseId);
  await audit(actor.id, "lesson.create", "Lesson", lesson.id, { moduleId, title: data.title, type: data.type });
  return lesson;
}

export async function updateLesson(actor: SessionUser, id: string, input: z.input<typeof lessonSchema>) {
  const data = lessonSchema.parse(input);
  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      title: data.title,
      type: data.type,
      contentUrl: data.contentUrl || null,
      body: data.body || null,
      durationSec: data.durationSec,
    },
    include: { module: true, quiz: true },
  });
  if (data.type === "QUIZ" && !lesson.quiz) await prisma.quiz.create({ data: { lessonId: id, ...(await quizDefaults()) } });
  await recomputeDuration(lesson.module.courseId);
  await audit(actor.id, "lesson.update", "Lesson", id);
  return lesson;
}

export async function deleteLesson(actor: SessionUser, id: string) {
  const lesson = await prisma.lesson.delete({ where: { id }, include: { module: true } });
  await recomputeDuration(lesson.module.courseId);
  await audit(actor.id, "lesson.delete", "Lesson", id);
}

export async function reorderLessons(actor: SessionUser, moduleId: string, ids: string[]) {
  const current = await prisma.lesson.findMany({ where: { moduleId }, select: { id: true } });
  if (current.length !== ids.length || !current.every((l) => ids.includes(l.id))) {
    throw new ValidationError("Reorder list must contain every lesson exactly once");
  }
  await prisma.$transaction([
    ...ids.map((id, i) => prisma.lesson.update({ where: { id }, data: { order: -(i + 1) } })),
    ...ids.map((id, i) => prisma.lesson.update({ where: { id }, data: { order: i + 1 } })),
  ]);
}

// ---------- Quiz authoring ----------

export async function updateQuizSettings(actor: SessionUser, quizId: string, input: z.input<typeof quizSettingsSchema>) {
  const data = quizSettingsSchema.parse(input);
  await prisma.quiz.update({ where: { id: quizId }, data });
  await audit(actor.id, "quiz.update", "Quiz", quizId, data);
}

export async function addQuestion(actor: SessionUser, quizId: string, input: z.input<typeof questionSchema>) {
  const data = questionSchema.parse(input);
  let options = data.options;
  let answer: number | boolean | string = data.answer;
  if (data.type === "MCQ") {
    if (options.length < 2) throw new ValidationError("Multiple-choice questions need at least two options");
    const idx = Number(answer);
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) throw new ValidationError("Pick the correct option");
    answer = idx;
  } else if (data.type === "TRUE_FALSE") {
    options = ["True", "False"];
    answer = answer === true || answer === "true";
  } else {
    options = [];
    answer = String(answer ?? "");
  }
  const q = await prisma.question.create({ data: { quizId, text: data.text, type: data.type, options, answer, points: data.points } });
  await audit(actor.id, "question.create", "Question", q.id, { quizId });
  return q;
}

export async function deleteQuestion(actor: SessionUser, id: string) {
  await prisma.question.delete({ where: { id } });
  await audit(actor.id, "question.delete", "Question", id);
}
