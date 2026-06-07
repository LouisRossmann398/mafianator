import { TIP_SEASON_ID } from "@shared/leagues";
import { requireAuth } from "./_lib/auth.ts";
import { stores$ } from "./_lib/blobs.ts";
import { saveLeagueMatches } from "./_lib/league-match-store.ts";
import { runEvaluation } from "./evaluate-bets.mts";
import { syncAllLeagueMatches } from "./_lib/scrapers/bfv.ts";
import { error, json, notAllowed } from "./_lib/response.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return notAllowed(["POST"]);

  const auth = await requireAuth(req, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const synced = await syncAllLeagueMatches();
    await saveLeagueMatches(synced.matches, TIP_SEASON_ID);
    const withResults = synced.matches.filter((m) => m.result).length;
    await stores$.meta().set("bfv-sync-status", {
      lastRun: new Date().toISOString(),
      seasonId: TIP_SEASON_ID,
      matchesTotal: synced.matches.length,
      withResults,
      kreisklasse: synced.kreisklasse,
      cKlasse: synced.cKlasse,
    });
    const evaluation = await runEvaluation().catch((e) => {
      console.error("[bfv-sync] evaluate failed", e);
      return { evaluated: 0, reEvaluated: 0 };
    });
    return json({
      ok: true,
      seasonId: TIP_SEASON_ID,
      matchesTotal: synced.matches.length,
      withResults,
      kreisklasse: synced.kreisklasse,
      cKlasse: synced.cKlasse,
      evaluation,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[bfv-sync] failed", e);
    await stores$.meta().set("bfv-sync-status", {
      lastRun: new Date().toISOString(),
      lastError: message,
      seasonId: TIP_SEASON_ID,
    } as never);
    return error(500, message);
  }
};

export const config = {
  path: "/api/bfv-sync",
  timeout: 30,
};
