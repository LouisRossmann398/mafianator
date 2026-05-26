import { requireAuth } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";
import { syncBadges } from "./_lib/achievements.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const record = await syncBadges(auth.user.playerId, auth.user.username);
  return json({ record });
};

export const config = {
  path: "/api/achievements",
};
