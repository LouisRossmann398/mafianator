import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { getMatchById } from "./_lib/match-store.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { normalizeMatch } from "@shared/leagues.ts";
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
    if (url.searchParams.get("mine") === "1") {
      const { runEvaluation } = await import("./evaluate-bets.mts");
      await runEvaluation().catch((e) => console.error("[bets] evaluate failed", e));
    }
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

    const bulk = body as { bets?: Array<Partial<Bet>> };
    if (Array.isArray(bulk.bets)) {
      const saved: Bet[] = [];
      const errors: string[] = [];
      for (const item of bulk.bets) {
        const result = await saveBet(auth.user.username, item);
        if ("bet" in result) saved.push(result.bet);
        else if ("message" in result) errors.push(result.message);
      }
      return json({ bets: saved, errors });
    }

    const payload = body as Partial<Bet>;
    const result = await saveBet(auth.user.username, payload);
    if ("error" in result) return result.error;
    if (!("bet" in result)) return error(400, result.message);
    return json({ bet: result.bet });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (!matchId) return error(400, "matchId fehlt");
    const key = betKey(auth.user.username, matchId);
    const existing = await stores$.bets().get(key);
    if (!existing) return json({ ok: true });
    const match = await getMatchById(matchId);
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

async function saveBet(
  userId: string,
  payload: Partial<Bet>,
): Promise<{ bet: Bet } | { error: Response } | { message: string }> {
  if (
    !payload.matchId ||
    typeof payload.homeGoals !== "number" ||
    typeof payload.awayGoals !== "number"
  ) {
    return { message: "matchId, homeGoals, awayGoals sind Pflicht" };
  }
  if (payload.homeGoals < 0 || payload.awayGoals < 0) {
    return { message: "Negative Tore nicht erlaubt" };
  }
  const raw = await getMatchById(payload.matchId);
  if (!raw) return { message: "Spiel nicht gefunden" };
  const match = normalizeMatch(raw);
  if (!match.tippable || match.involvesSvp) {
    return { message: "Auf SVP-Spiele kann nicht getippt werden" };
  }
  if (new Date(match.kickoff).getTime() <= Date.now()) {
    return { message: "Anpfiff bereits erreicht" };
  }
  const key = betKey(userId, payload.matchId);
  const existing = await stores$.bets().get(key);
  const bet: Bet = {
    id: key,
    userId,
    matchId: payload.matchId,
    homeGoals: Math.floor(payload.homeGoals),
    awayGoals: Math.floor(payload.awayGoals),
    submittedAt: new Date().toISOString(),
    points: existing?.points,
    evaluatedAt: existing?.evaluatedAt,
  };
  await stores$.bets().set(key, bet);
  return { bet };
}

