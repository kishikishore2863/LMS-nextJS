import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "MANAGER", "LEARNER"]);

export const loginSchema = z.object({
  email: z.email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((s) => s.toLowerCase().trim()),
  role: roleSchema.default("LEARNER"),
  password: z.string().min(8).max(128).optional(),
  teamId: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  managerIds: z.array(z.string()).default([]),
  memberIds: z.array(z.string()).default([]),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(4000).default(""),
  categoryId: z.string().nullish(),
  thumbnail: z.string().url().nullish().or(z.literal("")),
});

export const courseUpdateSchema = courseSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const moduleSchema = z.object({ title: z.string().trim().min(1).max(140) });

export const lessonSchema = z.object({
  title: z.string().trim().min(1).max(140),
  type: z.enum(["VIDEO", "PDF", "TEXT", "QUIZ"]),
  contentUrl: z.string().trim().max(2000).nullish(),
  body: z.string().max(50000).nullish(),
  durationSec: z.coerce.number().int().min(0).max(36000).default(0),
});

export const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const questionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT"]),
  options: z.array(z.string().trim().min(1)).default([]),
  answer: z.union([z.number().int(), z.boolean(), z.string()]),
  points: z.coerce.number().int().min(1).max(100).default(1),
});

export const quizSettingsSchema = z.object({
  passPct: z.coerce.number().int().min(1).max(100),
  maxAttempts: z.coerce.number().int().min(1).max(20),
});

export const assignmentSchema = z
  .object({
    courseId: z.string().min(1),
    userIds: z.array(z.string()).optional(),
    teamId: z.string().optional(),
    dueDate: z.coerce.date().nullish(),
  })
  .refine((v) => (v.userIds && v.userIds.length > 0) || v.teamId, {
    message: "Provide userIds[] or teamId",
  });

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  position: z.coerce.number().int().min(0).default(0),
  completed: z.boolean().default(false),
});

export const enrollSchema = z.object({ courseId: z.string().min(1) });

export const attemptSchema = z.object({
  answers: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])),
});

export const gradeSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
