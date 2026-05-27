import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { ensureMatchesPopulated } from "./_lib/matches-init.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { newId } from "./_lib/ids.ts";
import { normalizeMatch } from "@shared/leagues.ts";
import type { LeagueKey, Match, TeamId } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const teamParam = url.searchParams.get("team");
  const upcoming = url.searchParams.get("upcoming");
  const svpOnly = url.searchParams.get("svpOnly");
  const leagueKeyParam = url.searchParams.get("leagueKey");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    let rawMatches = await stores$.matches().all();
    if (rawMatches.length === 0) {
      try {
        await ensureMatchesPopulated();
        rawMatches = await stores$.matches().all();
      } catch (e) {
        console.error("[matches] populate failed", e);
      }
    }
    let matches = rawMatches.map(normalizeMatch);
    if (teamParam) {
      const team = Number(teamParam) as TeamId;
      matches = matches.filter((m) => m.team === team);
    }
    if (svpOnly === "1") {
      matches = matches.filter((m) => m.involvesSvp);
    }
    if (leagueKeyParam === "kreisklasse" || leagueKeyParam === "c-klasse") {
      matches = matches.filter((m) => m.leagueKey === (leagueKeyParam as LeagueKey));
    }
    if (upcoming) {
      const now = Date.now();
      matches = matches.filter((m) => new Date(m.kickoff).getTime() >= now - 3 * 60 * 60_000);
      matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    } else {
      matches.sort((a, b) => b.kickoff.localeCompare(a.kickoff));
    }
    const scrapeStatus = (await stores$.meta().get("scrape-status")) as {
      lastError?: string;
      matchesTotal?: number;
      lastRun?: string;
    } | null;
    return json({ matches, scrapeStatus: scrapeStatus ?? undefined });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<Match>;
    if (!payload.kickoff) return error(400, "kickoff ist Pflicht");
    const team = payload.team as TeamId | undefined;
    const leagueKey: LeagueKey =
      payload.leagueKey ?? (team === 2 ? "c-klasse" : "kreisklasse");
    const involvesSvp = payload.involvesSvp ?? !!team;
    const homeTeamName =
      payload.homeTeamName ??
      (payload.homeAway === "home" ? "SV Petershausen" : payload.opponent);
    const awayTeamName =
      payload.awayTeamName ??
      (payload.homeAway === "away" ? "SV Petershausen" : payload.opponent);
    if (!homeTeamName || !awayTeamName) {
      return error(400, "homeTeamName und awayTeamName (oder SVP-Felder) sind Pflicht");
    }
    const match: Match = normalizeMatch({
      id: newId(),
      leagueKey,
      round: payload.round,
      homeTeamName,
      awayTeamName,
      involvesSvp,
      tippable: payload.tippable ?? !involvesSvp,
      team,
      opponent: payload.opponent,
      homeAway: payload.homeAway,
      kickoff: payload.kickoff,
      location: payload.location,
      league:
        payload.league ??
        (leagueKey === "kreisklasse" ? "Kreisklasse 1 München" : "C-Klasse 1 München"),
      result: payload.result,
      source: "manual",
      updatedAt: new Date().toISOString(),
    });
    await stores$.matches().set(match.id, match);
    return json({ match }, 201);
  }

  if (req.method === "PUT") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const existing = await stores$.matches().get(id);
    if (!existing) return error(404, "Match nicht gefunden");
    const payload = body as Partial<Match>;
    const updated: Match = {
      ...existing,
      ...payload,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    await stores$.matches().set(id, updated);
    return json({ match: updated });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.matches().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PUT", "DELETE"]);
};

export const config = {
  path: "/api/matches",
};
