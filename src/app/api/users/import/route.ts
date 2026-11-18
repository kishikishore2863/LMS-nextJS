import { handler, ok } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { mutationGuard } from "@/server/auth/api";
import { importUsersCsv } from "@/server/services/user.service";

/** Accepts text/csv or multipart (field "file"). Columns: name,email,role,team. */
export const POST = handler(async (req: Request) => {
  const actor = await mutationGuard("user:manage");
  let csv: string;
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw new ValidationError("Missing file");
    csv = await file.text();
  } else {
    csv = await req.text();
  }
  if (csv.length > 1_000_000) throw new ValidationError("CSV too large (1 MB max)");
  return ok(await importUsersCsv(actor, csv));
});
