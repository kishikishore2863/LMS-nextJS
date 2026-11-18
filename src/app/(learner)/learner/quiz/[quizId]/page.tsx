import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/permissions";
import { getQuizForLearner } from "@/server/services/quiz.service";
import { NotFoundError } from "@/lib/errors";
import { Badge, Card, CardHeader } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { QuizRunner } from "@/components/course/quiz-runner";
import { formatDateTime } from "@/lib/utils";

export default async function QuizPage({ params }: PageProps<"/learner/quiz/[quizId]">) {
  const user = await requirePermission("course:take");
  const { quizId } = await params;
  const quiz = await getQuizForLearner(user, quizId).catch((e) => (e instanceof NotFoundError ? notFound() : Promise.reject(e)));
  const slug = quiz.lesson.module.course.slug;
  const pendingReview = quiz.attempts.some((a) => a.needsReview);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/learner/courses/${slug}/lessons/${quiz.lesson.id}`} className="text-sm text-muted hover:text-foreground">← {quiz.lesson.module.course.title}</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{quiz.lesson.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {quiz.questions.length} questions · pass mark {quiz.passPct}% · {quiz.attemptsLeft} of {quiz.maxAttempts} attempts left
        </p>
      </div>
      <QuizRunner
        quiz={{ id: quiz.id, passPct: quiz.passPct, questions: quiz.questions }}
        locked={quiz.passed ? "passed" : pendingReview ? "review" : quiz.attemptsLeft === 0 ? "exhausted" : null}
        backHref={`/learner/courses/${slug}`}
      />
      {quiz.attempts.length > 0 && (
        <Card>
          <CardHeader title="Your attempts" />
          <DataTable
            data={quiz.attempts}
            rowKey={(a) => a.id}
            columns={[
              { header: "Submitted", cell: (a) => formatDateTime(a.createdAt) },
              { header: "Score", cell: (a) => (a.needsReview ? "—" : `${a.score}%`) },
              { header: "Result", cell: (a) => (a.needsReview ? <Badge tone="warning">awaiting review</Badge> : a.passed ? <Badge tone="success">passed</Badge> : <Badge tone="danger">not passed</Badge>) },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
