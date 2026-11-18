import { fail, handler, ok } from "@/lib/api";
import { requireUser } from "@/server/auth/permissions";
import { MAX_UPLOAD_BYTES, contentTypeFor, putLocal, readLocal, verifySignature } from "@/lib/storage";

type Ctx = { params: Promise<{ key: string[] }> };

/** Pre-signed PUT target (local storage driver). */
export const PUT = handler(async (req: Request, { params }: Ctx) => {
  const key = (await params).key.join("/");
  const sp = new URL(req.url).searchParams;
  if (!verifySignature(key, Number(sp.get("exp")), sp.get("sig") ?? "")) return fail("forbidden", "Invalid or expired upload URL", 403);
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX_UPLOAD_BYTES) return fail("validation", "File too large", 400);
  await putLocal(key, buf);
  return ok({ key, fileUrl: `/api/uploads/local/${key}` });
});

/** Signed-in users can read uploaded lesson content. */
export const GET = handler(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const key = (await params).key.join("/");
  try {
    const data = await readLocal(key);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return fail("not_found", "File not found", 404);
  }
});
