import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";

/** Idempotent: returns the existing certificate if one was already issued. */
export async function issueCertificate(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment || enrollment.status !== "COMPLETED") return null;
  const existing = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) return existing;
  const code = randomBytes(5).toString("hex").toUpperCase();
  return prisma.certificate.create({
    data: { userId, courseId, code, pdfUrl: `/api/certificates/${code}/pdf` },
  });
}

export async function listCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    include: { course: { select: { title: true, slug: true, durationMin: true } } },
  });
}

export async function listAllCertificates(limit = 100) {
  return prisma.certificate.findMany({
    orderBy: { issuedAt: "desc" },
    take: limit,
    include: { course: { select: { title: true } }, user: { select: { name: true, email: true } } },
  });
}

/** Public verification — exposes only what a certificate shows on paper. */
export async function verifyCertificate(code: string) {
  const cert = await prisma.certificate.findUnique({
    where: { code: code.toUpperCase() },
    include: { user: { select: { name: true } }, course: { select: { title: true, durationMin: true } } },
  });
  if (!cert) throw new NotFoundError("Certificate");
  return {
    code: cert.code,
    learner: cert.user.name,
    course: cert.course.title,
    durationMin: cert.course.durationMin,
    issuedAt: cert.issuedAt,
    pdfUrl: cert.pdfUrl,
  };
}
