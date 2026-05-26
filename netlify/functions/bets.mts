import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import type { Bet, Match } from "@shared/types";

function betKey(userId: string, matchId: string): string {
  return `${userId}__${encodeURIComponent(matchId)}`;
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("matchId");
  const userId = url.searchParams.get("userId");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const all = await stores$.bets().all();
    let filtered = all;
    if (matchId) filtered = filtered.filter((b) => b.matchId === matchId);
    if (userId) filtered = filtered.filter((b) => b.userId === userId);
    if (url.searchParams.get("mine") === "1") {
      filtered = filtered.filter((b) => b.userId === auth.user.username);
    }
    return json({ bets: filtered });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<Bet>;
    if (
      !payload.matchId ||
      typeof payload.homeGoals !== "number" ||
      typeof payload.awayGoals !== "number"
    ) {
      return error(400, "matchId, homeGoals, awayGoals sind Pflicht");
    }
    if (payload.homeGoals < 0 || payload.awayGoals < 0) return error(400, "Negative Tore? Nope.");
    const match = (await stores$.matches().get(payload.matchId)) as Match | null;
    if (!match) return error(404, "Spiel nicht gefunden");
    if (new Date(match.kickoff).getTime() <= Date.now()) {
      return error(400, "Anpfiff bereits erreicht, Tipp nicht mehr moeglich");
    }
    const key = betKey(auth.user.username, payload.matchId);
    const existing = await stores$.bets().get(key);
    const bet: Bet = {
      id: key,
      userId: auth.user.username,
      matchId: payload.matchId,
      homeGoals: Math.floor(payload.homeGoals),
      awayGoals: Math.floor(payload.awayGoals),
      submittedAt: new Date().toISOString(),
      points: existing?.points,
      evaluatedAt: existing?.evaluatedAt,
    };
    await stores$.bets().set(key, bet);
    return json({ bet });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (!matchId) return error(400, "matchId fehlt");
    const key = betKey(auth.user.username, matchId);
    const existing = await stores$.bets().get(key);
    if (!existing) return json({ ok: true });
    const match = (await stores$.matches().get(matchId)) as Match | null;
    if (match && new Date(match.kickoff).getTime() <= Date.now()) {
      return error(400, "Anpfiff vorbei, Tipp nicht mehr loeschbar");
    }
    await stores$.bets().delete(key);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "DELETE"]);
};

export const config = {
  path: "/api/bets",
};

