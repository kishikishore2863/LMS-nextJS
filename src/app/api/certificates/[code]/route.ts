import { handler, ok } from "@/lib/api";
import { verifyCertificate } from "@/server/services/certificate.service";

type Ctx = { params: Promise<{ code: string }> };

/** Public verification endpoint. */
export const GET = handler(async (_req: Request, { params }: Ctx) => ok(await verifyCertificate((await params).code)));
