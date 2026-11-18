# Learnly LMS

A learning management system built from the *LMS (Next.js) — High-Level & Low-Level Design* doc:
one Next.js app with three role dashboards (Admin, Manager, Learner), RBAC, a course builder,
enrolments and assignments, progress tracking, quizzes with manual review, certificates,
notifications and analytics.

## Quick start

```bash
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres 16 + Redis (or use your own Postgres)
npm install                   # also runs prisma generate
npx prisma migrate dev        # create the schema
npx prisma db seed            # demo data
npm run dev
```

Open http://localhost:3000 and sign in with a seeded account (password `password123`, dev only):

| Role    | Email               |
|---------|---------------------|
| Admin   | admin@lms.test      |
| Manager | manager1@lms.test / manager2@lms.test |
| Learner | learner1@lms.test … learner20@lms.test |

Redis is optional. Without `REDIS_URL`, dashboard stats are cached in memory and background jobs
(assignment notifications, certificate generation) run inline. With Redis, run `npm run worker`.
Google SSO turns on when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.

## What's in it

| Area | Where |
|---|---|
| RBAC route guard (Next 16 `proxy.ts`, formerly middleware) | `src/proxy.ts`, `src/server/auth/roles.ts` |
| Permission matrix + scope checks | `src/server/auth/policy.ts`, `src/server/auth/permissions.ts` |
| Services (all data access) | `src/server/services/*` |
| Server Actions | `src/server/actions/*` |
| REST API (section 6 table) | `src/app/api/**` |
| Flow A — assign course | `enrollment.service.ts → assignCourse` |
| Flow B — progress roll-up & completion | `progress.service.ts`, `enrollment.service.ts → recomputeEnrollment` |
| Flow C — quiz grading & review | `quiz.service.ts`, `grading.ts` |
| Jobs (BullMQ producer / consumers) | `src/server/jobs/*`, `src/worker/index.ts` |
| Certificates (PDF + public verify page) | `src/lib/pdf.ts`, `/verify/[code]` |
| Uploads (pre-signed, 10-min expiry; local driver) | `src/lib/storage.ts`, `/api/uploads/*` |

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run worker` · `npm run db:seed`

## Not yet done (from the design's roadmap)

- S3/R2 presigner (the local storage driver implements the same pre-signed contract)
- Mux/Cloudflare Stream HLS (lessons take any MP4/WebM URL or upload; the video webhook updates durations)
- Playwright end-to-end tests and GitHub Actions CI
- Sentry / OpenTelemetry
