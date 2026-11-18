import { z } from "zod";
import { handler, ok, parseJson } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { mutationGuard } from "@/server/auth/api";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, presignPut } from "@/lib/storage";

const body = z.object({ filename: z.string().min(1).max(200), contentType: z.string(), size: z.number().int().positive() });

export const POST = handler(async (req: Request) => {
  await mutationGuard("course:write");
  const { filename, contentType, size } = await parseJson(req, body);
  if (!ALLOWED_TYPES.includes(contentType)) throw new ValidationError(`Unsupported type ${contentType}`);
  if (size > MAX_UPLOAD_BYTES) throw new ValidationError("File too large (200 MB max)");
  return ok(presignPut(filename));
});
