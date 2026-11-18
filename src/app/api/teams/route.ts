import { handler, ok, parseJson } from "@/lib/api";
import { teamSchema } from "@/lib/validators";
import { requirePermission } from "@/server/auth/permissions";
import { mutationGuard } from "@/server/auth/api";
import { listTeams, saveTeam } from "@/server/services/team.service";

export const GET = handler(async () => {
  await requirePermission("team:manage");
  return ok(await listTeams());
});

export const POST = handler(async (req: Request) => {
  const actor = await mutationGuard("team:manage");
  const team = await saveTeam(actor, await parseJson(req, teamSchema));
  return ok(team, undefined, 201);
});
