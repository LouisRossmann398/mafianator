import { TIP_SEASON_ID } from "@shared/leagues";
import type { LeagueKey } from "@shared/types";
import { requireAuth } from "./_lib/auth.ts";
import { loadLeagueMatches, saveLeagueMatches } from "./_lib/league-match-store.ts";
import { syncAllLeagueMatches } from "./_lib/scrapers/bfv.ts";
import { error, json, notAllowed } from "./_lib/response.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const leagueKeyParam = url.searchParams.get("leagueKey");
  const seasonId = url.searchParams.get("season") ?? TIP_SEASON_ID;

  let matches = await loadLeagueMatches(seasonId);
  if (matches.length === 0) {
    try {
      const synced = await syncAllLeagueMatches();
      matches = synced.matches;
      await saveLeagueMatches(matches, seasonId);
      await storesMeta(synced);
    } catch (e) {
      console.error("[league-matches] auto-sync failed", e);
      const message = e instanceof Error ? e.message : String(e);
      const scrapeStatus = await loadScrapeStatus();
      return json({
        matches: [],
        seasonId,
        scrapeStatus: { ...scrapeStatus, lastError: message },
      });
    }
  }

  if (leagueKeyParam === "kreisklasse" || leagueKeyParam === "c-klasse") {
    matches = matches.filter((m) => m.leagueKey === (leagueKeyParam as LeagueKey));
  }

  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const scrapeStatus = await loadScrapeStatus();

  return json({ matches, seasonId, scrapeStatus });
};

async function storesMeta(synced: {
  kreisklasse: number;
  cKlasse: number;
  matches: unknown[];
}) {
  const { stores$ } = await import("./_lib/blobs.ts");
  await stores$.meta().set("bfv-sync-status", {
    lastRun: new Date().toISOString(),
    seasonId: TIP_SEASON_ID,
    matchesTotal: synced.matches.length,
    kreisklasse: synced.kreisklasse,
    cKlasse: synced.cKlasse,
  });
}

async function loadScrapeStatus() {
  const { stores$ } = await import("./_lib/blobs.ts");
  return (await stores$.meta().get("bfv-sync-status")) as {
    lastRun?: string;
    lastError?: string;
    matchesTotal?: number;
    kreisklasse?: number;
    cKlasse?: number;
  } | null;
}

export const config = {
  path: "/api/league-matches",
  timeout: 30,
};
