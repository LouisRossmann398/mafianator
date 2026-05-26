import { requireAuth } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";
import { computeBalances, getCurrentSeason } from "./_lib/balance.ts";
import { stores$ } from "./_lib/blobs.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const [balances, season, players] = await Promise.all([
    computeBalances(),
    getCurrentSeason(),
    stores$.players().all(),
  ]);
  return json({ balances, season, players });
};

export const config = {
  path: "/api/balances",
};
