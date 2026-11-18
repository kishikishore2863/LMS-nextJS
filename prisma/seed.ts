/**
 * Demo data: 1 admin, 2 managers, 2 teams, 20 learners, 5 courses with modules,
 * lessons and quizzes, plus random enrolments / progress / attempts.
 *
 * Every seeded account uses the password: password123
 *   admin@lms.test · manager1@lms.test · manager2@lms.test · learner1..20@lms.test
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type LessonType } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Deterministic PRNG so the demo data is the same on every seed.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400_000);

const VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

type LessonSeed = { title: string; type: LessonType; durationSec: number; body?: string; quiz?: QSeed[] };
type QSeed = { text: string; type: "MCQ" | "TRUE_FALSE" | "SHORT"; options?: string[]; answer: number | boolean | string };

const COURSES: { title: string; category: string; description: string; status?: "DRAFT"; modules: { title: string; lessons: LessonSeed[] }[] }[] = [
  {
    title: "Information Security Essentials",
    category: "Compliance",
    description: "Protect company data: passwords, phishing, devices and incident reporting.",
    modules: [
      {
        title: "Foundations",
        lessons: [
          { title: "Why security matters", type: "VIDEO", durationSec: 300 },
          { title: "Password hygiene", type: "TEXT", durationSec: 240, body: "Use a password manager.\n\nNever reuse passwords across services. Turn on multi-factor authentication wherever it is offered — it stops the vast majority of account takeovers." },
        ],
      },
      {
        title: "Threats",
        lessons: [
          { title: "Spotting phishing", type: "VIDEO", durationSec: 420 },
          { title: "Security policy (PDF)", type: "PDF", durationSec: 600 },
          {
            title: "Security check",
            type: "QUIZ",
            durationSec: 300,
            quiz: [
              { text: "Which is the strongest protection for your account?", type: "MCQ", options: ["A long password", "Multi-factor authentication", "Changing password monthly"], answer: 1 },
              { text: "It is fine to reuse a password if it is complex.", type: "TRUE_FALSE", answer: false },
              { text: "Unexpected attachments from known senders can still be phishing.", type: "TRUE_FALSE", answer: true },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Effective Feedback for Managers",
    category: "Leadership",
    description: "Give clear, kind and actionable feedback that helps your team grow.",
    modules: [
      {
        title: "Principles",
        lessons: [
          { title: "The SBI model", type: "VIDEO", durationSec: 480 },
          { title: "Feedback checklist", type: "TEXT", durationSec: 180, body: "Be specific. Describe the situation, the behaviour, and its impact.\n\nAsk questions, listen, and agree on a next step." },
        ],
      },
      {
        title: "Practice",
        lessons: [
          {
            title: "Feedback reflection",
            type: "QUIZ",
            durationSec: 600,
            quiz: [
              { text: "SBI stands for Situation, Behaviour, …", type: "MCQ", options: ["Intent", "Impact", "Improvement"], answer: 1 },
              { text: "Describe a time you gave feedback and what you would do differently.", type: "SHORT", answer: "Open answer — look for specific situation, behaviour and impact." },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "TypeScript Fundamentals",
    category: "Engineering",
    description: "Types, interfaces, generics and narrowing for everyday product code.",
    modules: [
      {
        title: "Getting started",
        lessons: [
          { title: "Why TypeScript", type: "VIDEO", durationSec: 360 },
          { title: "Basic types", type: "TEXT", durationSec: 420, body: "string, number, boolean, arrays and tuples.\n\nPrefer type inference; annotate function boundaries." },
        ],
      },
      {
        title: "Going further",
        lessons: [
          { title: "Generics", type: "VIDEO", durationSec: 540 },
          { title: "Narrowing", type: "TEXT", durationSec: 300, body: "Use typeof, instanceof, `in` and discriminated unions to narrow types safely." },
          {
            title: "TypeScript quiz",
            type: "QUIZ",
            durationSec: 300,
            quiz: [
              { text: "Which keyword declares a generic type parameter list?", type: "MCQ", options: ["<T>", "[T]", "{T}"], answer: 0 },
              { text: "`unknown` must be narrowed before use.", type: "TRUE_FALSE", answer: true },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Customer Communication",
    category: "Sales",
    description: "Write and speak with clarity and empathy across every customer touchpoint.",
    modules: [
      {
        title: "Basics",
        lessons: [
          { title: "Active listening", type: "VIDEO", durationSec: 300 },
          { title: "Email templates (PDF)", type: "PDF", durationSec: 300 },
          {
            title: "Communication check",
            type: "QUIZ",
            durationSec: 240,
            quiz: [
              { text: "Active listening includes summarising what you heard.", type: "TRUE_FALSE", answer: true },
              { text: "Best first response to an upset customer?", type: "MCQ", options: ["Explain the policy", "Acknowledge their frustration", "Escalate immediately"], answer: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Data Privacy & GDPR",
    category: "Compliance",
    description: "Draft course — personal data, lawful basis and data subject rights.",
    status: "DRAFT",
    modules: [{ title: "Introduction", lessons: [{ title: "What is personal data?", type: "TEXT", durationSec: 300, body: "Any information relating to an identified or identifiable person." }] }],
  },
];

async function main() {
  console.log("Resetting data…");
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.question.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.category.deleteMany(),
    prisma.teamManager.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.create({ data: { email: "admin@lms.test", name: "Ada Admin", role: "ADMIN", passwordHash, createdAt: daysFromNow(-120) } });
  const managers = await Promise.all(
    [
      ["manager1@lms.test", "Maya Manager"],
      ["manager2@lms.test", "Omar Okafor"],
    ].map(([email, name]) => prisma.user.create({ data: { email: email!, name: name!, role: "MANAGER", passwordHash, createdAt: daysFromNow(-100) } })),
  );
  const first = ["Liam", "Emma", "Noah", "Olivia", "Ava", "Elijah", "Sofia", "Lucas", "Mia", "Ethan", "Isla", "Arjun", "Zara", "Kenji", "Priya", "Mateo", "Leah", "Tomás", "Nora", "Yusuf"];
  const last = ["Smith", "Garcia", "Chen", "Patel", "Müller", "Rossi", "Kim", "Silva", "Nguyen", "Brown"];
  const learners = [];
  for (let i = 0; i < 20; i++) {
    learners.push(
      await prisma.user.create({
        data: { email: `learner${i + 1}@lms.test`, name: `${first[i]} ${pick(last)}`, role: "LEARNER", passwordHash, createdAt: daysFromNow(-Math.floor(rand() * 90)) },
      }),
    );
  }

  const teams = await Promise.all(["Engineering", "Customer Success"].map((name) => prisma.team.create({ data: { name } })));
  for (const [i, m] of managers.entries()) await prisma.teamManager.create({ data: { teamId: teams[i]!.id, userId: m.id } });
  for (const [i, l] of learners.entries()) await prisma.teamMember.create({ data: { teamId: teams[i < 10 ? 0 : 1]!.id, userId: l.id } });
  // Managers can learn too — put them in their own team as members.
  for (const [i, m] of managers.entries()) await prisma.teamMember.create({ data: { teamId: teams[i]!.id, userId: m.id } });

  console.log("Creating courses…");
  const courseRecords = [];
  for (const c of COURSES) {
    const category = await prisma.category.upsert({ where: { name: c.category }, update: {}, create: { name: c.category } });
    const totalSec = c.modules.flatMap((m) => m.lessons).reduce((n, l) => n + l.durationSec, 0);
    const course = await prisma.course.create({
      data: {
        title: c.title,
        slug: c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        description: c.description,
        status: c.status ?? "PUBLISHED",
        publishedAt: c.status ? null : daysFromNow(-80),
        categoryId: category.id,
        createdById: admin.id,
        durationMin: Math.round(totalSec / 60),
        createdAt: daysFromNow(-85),
      },
    });
    for (const [mi, m] of c.modules.entries()) {
      const mod = await prisma.module.create({ data: { courseId: course.id, title: m.title, order: mi + 1 } });
      for (const [li, l] of m.lessons.entries()) {
        await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: l.title,
            type: l.type,
            order: li + 1,
            durationSec: l.durationSec,
            body: l.body,
            contentUrl: l.type === "VIDEO" ? VIDEO : l.type === "PDF" ? PDF : null,
            ...(l.quiz
              ? {
                  quiz: {
                    create: {
                      passPct: 70,
                      maxAttempts: 3,
                      questions: {
                        create: l.quiz.map((q) => ({
                          text: q.text,
                          type: q.type,
                          options: q.type === "TRUE_FALSE" ? ["True", "False"] : (q.options ?? []),
                          answer: q.answer,
                        })),
                      },
                    },
                  },
                }
              : {}),
          },
        });
      }
    }
    courseRecords.push(course);
  }

  console.log("Creating enrolments and progress…");
  const published = courseRecords.filter((c) => c.status === "PUBLISHED");
  const lessonsByCourse = new Map<string, { id: string; type: LessonType; durationSec: number; quiz: { id: string; questions: { id: string; type: string; answer: unknown }[] } | null }[]>();
  for (const c of published) {
    lessonsByCourse.set(
      c.id,
      await prisma.lesson.findMany({
        where: { module: { courseId: c.id } },
        orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
        select: { id: true, type: true, durationSec: true, quiz: { select: { id: true, questions: { select: { id: true, type: true, answer: true } } } } },
      }),
    );
  }

  for (const learner of [...learners, ...managers]) {
    const courses = published.filter(() => rand() < 0.6);
    for (const course of courses) {
      const lessons = lessonsByCourse.get(course.id)!;
      const assigned = rand() < 0.6;
      const createdAt = daysFromNow(-Math.floor(rand() * 60) - 1);
      const dueDate = assigned ? daysFromNow(Math.floor(rand() * 40) - 15) : null;
      const doneCount = Math.floor(rand() * (lessons.length + 1) * 1.2);
      const completedLessons = lessons.slice(0, Math.min(doneCount, lessons.length));
      let lastTouch = createdAt;
      for (const [i, l] of completedLessons.entries()) {
        const at = new Date(Math.min(Date.now(), createdAt.getTime() + (i + 1) * 86400_000 * (0.5 + rand() * 3)));
        lastTouch = at;
        if (l.quiz) {
          const hasShort = l.quiz.questions.some((q) => q.type === "SHORT");
          const answers = Object.fromEntries(l.quiz.questions.map((q) => [q.id, q.type === "SHORT" ? "I gave specific feedback after a sprint review and focused on impact." : (q.answer as string | number | boolean)]));
          if (hasShort && rand() < 0.5) {
            await prisma.quizAttempt.create({ data: { quizId: l.quiz.id, userId: learner.id, answers, needsReview: true, createdAt: at } });
            break; // waiting for review, can't progress further
          }
          await prisma.quizAttempt.create({ data: { quizId: l.quiz.id, userId: learner.id, answers, score: 100, passed: true, createdAt: at } });
        }
        await prisma.lessonProgress.create({ data: { userId: learner.id, lessonId: l.id, completed: true, lastPosition: l.durationSec, updatedAt: at } });
      }
      const done = await prisma.lessonProgress.count({ where: { userId: learner.id, completed: true, lesson: { module: { courseId: course.id } } } });
      // Some partly-watched next lesson.
      const next = lessons[done];
      if (next && next.type === "VIDEO" && rand() < 0.5) {
        lastTouch = new Date(Math.min(Date.now(), lastTouch.getTime() + 86400_000));
        await prisma.lessonProgress.create({ data: { userId: learner.id, lessonId: next.id, completed: false, lastPosition: Math.floor(next.durationSec / 2), updatedAt: lastTouch } });
      }
      const pctDone = Math.round((100 * done) / lessons.length);
      const completed = pctDone === 100;
      await prisma.enrollment.create({
        data: {
          userId: learner.id,
          courseId: course.id,
          source: assigned ? "ASSIGNED" : "SELF",
          assignedBy: assigned ? managers[learners.indexOf(learner) < 10 ? 0 : 1]?.id ?? admin.id : null,
          dueDate,
          createdAt,
          progressPct: pctDone,
          status: completed ? "COMPLETED" : done > 0 || next ? (done > 0 ? "IN_PROGRESS" : "NOT_STARTED") : "NOT_STARTED",
          startedAt: done > 0 ? createdAt : null,
          completedAt: completed ? lastTouch : null,
        },
      });
      if (completed) {
        const code = randomBytes(5).toString("hex").toUpperCase();
        await prisma.certificate.create({ data: { userId: learner.id, courseId: course.id, code, pdfUrl: `/api/certificates/${code}/pdf`, issuedAt: lastTouch } });
      }
    }
  }

  // Recent activity for the first learner so the demo shows a streak.
  const demo = learners[0]!;
  const demoEnrol = await prisma.enrollment.findFirst({ where: { userId: demo.id, status: { not: "COMPLETED" } } });
  if (demoEnrol) {
    const lp = await prisma.lessonProgress.findMany({ where: { userId: demo.id, lesson: { module: { courseId: demoEnrol.courseId } } } });
    for (const [i, p] of lp.entries()) {
      await prisma.lessonProgress.update({ where: { userId_lessonId: { userId: p.userId, lessonId: p.lessonId } }, data: { updatedAt: daysFromNow(-i) } });
    }
  }

  await prisma.notification.createMany({
    data: learners.slice(0, 5).map((l) => ({ userId: l.id, type: "welcome", title: "Welcome to the LMS! Browse the catalogue to get started.", link: "/learner/catalog" })),
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "seed", entity: "System", entityId: "seed", meta: { learners: learners.length } } });

  const counts = {
    users: await prisma.user.count(),
    courses: await prisma.course.count(),
    enrollments: await prisma.enrollment.count(),
    attempts: await prisma.quizAttempt.count(),
    certificates: await prisma.certificate.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
