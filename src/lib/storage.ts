import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Object storage behind pre-signed URLs (10-minute expiry, section 8).
 * Dev/local driver: files are written to ./.uploads and served by /api/uploads/local/*.
 * Swap `presignPut` for an S3/R2 presigner in production (same contract).
 */
const ROOT = path.join(process.cwd(), ".uploads");
const EXPIRY_SEC = 600;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const ALLOWED_TYPES = ["video/mp4", "video/webm", "application/pdf", "image/png", "image/jpeg", "image/webp"];

function sign(key: string, exp: number) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`${key}:${exp}`).digest("hex");
}

export function presignPut(filename: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 8);
  const key = `${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString("hex")}${ext}`;
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_SEC;
  const sig = sign(key, exp);
  return {
    key,
    uploadUrl: `/api/uploads/local/${key}?exp=${exp}&sig=${sig}`,
    fileUrl: `/api/uploads/local/${key}`,
    method: "PUT" as const,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifySignature(key: string, exp: number, sig: string) {
  if (!exp || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function safePath(key: string) {
  const full = path.join(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid key");
  return full;
}

export async function putLocal(key: string, data: Buffer) {
  const full = safePath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readLocal(key: string) {
  return readFile(safePath(key));
}

export function contentTypeFor(key: string) {
  const ext = path.extname(key).toLowerCase();
  return (
    { ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext] ??
    "application/octet-stream"
  );
}
