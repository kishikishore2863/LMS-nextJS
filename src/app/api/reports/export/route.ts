import { z } from "zod";
import { handler } from "@/lib/api";
import { mutationGuard } from "@/server/auth/api";
import { REPORT_TYPES, buildReport } from "@/server/services/report.service";
import { audit } from "@/server/services/audit.service";

/**
 * CSV export scoped to the caller (admins: org, managers: own teams).
 * Returned directly; for very large orgs move this to a queued job that emails a link.
 */
export const GET = handler(async (req: Request) => {
  const actor = await mutationGuard("report:export");
  const type = z.enum(REPORT_TYPES).parse(new URL(req.url).searchParams.get("type") ?? "team-progress");
  const csv = await buildReport(actor, type);
  await audit(actor.id, "report.export", "Report", type);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
