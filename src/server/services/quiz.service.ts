import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { attemptSchema, gradeSchema } from "@/lib/validators";
import { assertLearnerInScope, managedTeamIds, type SessionUser } from "@/server/auth/permissions";
import { completeQuizLesson } from "./progress.service";
import { notify } from "./notification.service";
import { audit } from "./audit.service";
import { invalidateStats } from "./enrollment.service";
import { gradeAnswers, type GradableQuestion } from "./grading";
import type { z } from "zod";

/** Quiz for the learner: questions without answers (never sent to the client). */
export async function getQuizForLearner(user: SessionUser, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { select: { id: true, text: true, type: true, options: true, points: true } },
      lesson: { select: { id: true, title: true, module: { select: { courseId: true, course: { select: { slug: true, title: true } } } } } },
    },
  });
  if (!quiz) throw new NotFoundError("Quiz");
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.lesson.module.courseId } },
  });
  if (!enrolled) throw new ForbiddenError("not_enrolled");
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, passed: true, needsReview: true, createdAt: true },
  });
  return {
    id: quiz.id,
    passPct: quiz.passPct,
    maxAttempts: quiz.maxAttempts,
    lesson: quiz.lesson,
    questions: quiz.questions.map((q) => ({ ...q, options: (q.options as string[]) ?? [] })),
    attempts,
    attemptsLeft: Math.max(0, quiz.maxAttempts - attempts.length),
    passed: attempts.some((a) => a.passed),
  };
}

/** Flow C — server-side grading; short answers are queued for manual review. */
export async function submitAttempt(user: SessionUser, quizId: string, input: z.input<typeof attemptSchema>) {
  const { answers } = attemptSchema.parse(input);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, lesson: { select: { id: true, title: true, module: { select: { courseId: true } } } } },
  });
  if (!quiz) throw new NotFoundError("Quiz");
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.lesson.module.courseId } },
  });
  if (!enrolled) throw new ForbiddenError("not_enrolled");
  const prior = await prisma.quizAttempt.findMany({ where: { quizId, userId: user.id } });
  if (prior.some((a) => a.passed)) throw new ValidationError("You have already passed this quiz");
  if (prior.some((a) => a.needsReview)) throw new ValidationError("Your previous attempt is awaiting review");
  if (prior.length >= quiz.maxAttempts) throw new ValidationError("No attempts left");

  const result = gradeAnswers(quiz.questions as GradableQuestion[], answers, quiz.passPct);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      answers,
      score: result.needsReview ? null : result.score,
      passed: result.needsReview ? null : result.passed,
      needsReview: result.needsReview,
    },
  });
  if (result.passed && !result.needsReview) await completeQuizLesson(user.id, quiz.lesson.id);
  if (result.needsReview) {
    const managers = await prisma.teamManager.findMany({
      where: { team: { members: { some: { userId: user.id } } } },
      select: { userId: true },
    });
    for (const m of new Set(managers.map((x) => x.userId))) {
      await notify(m, "review", `Quiz "${quiz.lesson.title}" needs review`, "/manager/reviews");
    }
    await invalidateStats([user.id]);
  }
  return {
    attemptId: attempt.id,
    score: attempt.score,
    passed: attempt.passed,
    needsReview: attempt.needsReview,
    autoScore: result.score,
    attemptsLeft: quiz.maxAttempts - prior.length - 1,
  };
}

/** Attempts awaiting manual review, scoped to the actor's teams. */
export async function listPendingReviews(actor: SessionUser) {
  const teamIds = await managedTeamIds(actor);
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      needsReview: true,
      userId: { not: actor.id }, // nobody grades their own attempt
      ...(teamIds ? { user: { teams: { some: { teamId: { in: teamIds } } } } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      quiz: { include: { questions: true, lesson: { select: { title: true, module: { select: { course: { select: { title: true } } } } } } } },
    },
  });
  return attempts.map((a) => ({
    id: a.id,
    createdAt: a.createdAt,
    learner: a.user,
    lessonTitle: a.quiz.lesson.title,
    courseTitle: a.quiz.lesson.module.course.title,
    passPct: a.quiz.passPct,
    autoScore: gradeAnswers(a.quiz.questions as GradableQuestion[], a.answers as Record<string, unknown>, a.quiz.passPct).score,
    // Reviewers (not learners) may see expected answers.
    items: a.quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: (q.options as string[]) ?? [],
      expected: q.answer as unknown,
      given: (a.answers as Record<string, unknown>)[q.id] ?? null,
      points: q.points,
    })),
  }));
}

export async function gradeAttempt(actor: SessionUser, attemptId: string, input: z.input<typeof gradeSchema>) {
  const { score } = gradeSchema.parse(input);
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { lesson: { select: { id: true, title: true } } } } },
  });
  if (!attempt) throw new NotFoundError("Attempt");
  if (attempt.userId === actor.id) throw new ForbiddenError("own_attempt");
  await assertLearnerInScope(actor, attempt.userId);
  if (!attempt.needsReview) throw new ValidationError("Attempt was already graded");
  const passed = score >= attempt.quiz.passPct;
  await prisma.quizAttempt.update({ where: { id: attemptId }, data: { score, passed, needsReview: false } });
  await audit(actor.id, "attempt.grade", "QuizAttempt", attemptId, { score, passed });
  if (passed) await completeQuizLesson(attempt.userId, attempt.quiz.lesson.id);
  await notify(
    attempt.userId,
    "graded",
    `Your quiz "${attempt.quiz.lesson.title}" was graded: ${score}% (${passed ? "passed" : "not passed"})`,
    `/learner/quiz/${attempt.quizId}`,
  );
  await invalidateStats([attempt.userId]);
  return { score, passed };
}
