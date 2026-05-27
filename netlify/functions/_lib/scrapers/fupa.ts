import { LEAGUE_LABELS, svpTeamFromSlug } from "@shared/leagues.ts";
import type { LeagueKey, Match, TeamId } from "@shared/types";
import { fetchAllLeagueMatches } from "./fupa-league.ts";

interface FupaTeamMatch {
  id: number;
  slug: string;
  homeTeam: { slug: string; name: { full: string } };
  awayTeam: { slug: string; name: { full: string } };
  kickoff: string;
  homeGoal: number | null;
  awayGoal: number | null;
  competition?: { name?: string };
  round?: { number?: number; competitionSeason?: { name?: string } };
}

interface FupaJsonLdEvent {
  "@type": string;
  "@id"?: string;
  startDate?: string;
  homeTeam?: { "@id"?: string };
  awayTeam?: { "@id"?: string };
  superEvent?: { "@id"?: string };
  location?: { name?: string };
}

interface FupaJsonLdGraph {
  "@graph": (FupaJsonLdEvent & { name?: string })[];
}

const CLUB_SLUG = "sv-petershausen";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Mafianator/1.0; +https://github.com/sv-petershausen)";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FuPa request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`FuPa HTML request failed (${res.status}): ${url}`);
  return res.text();
}

function leagueKeyForTeam(team: TeamId): LeagueKey {
  return team === 1 ? "kreisklasse" : "c-klasse";
}

interface UpcomingTeamInfo {
  slug: string;
  name: string;
}

function findUpcoming(graph: FupaJsonLdGraph): Match[] {
  const teams = new Map<string, UpcomingTeamInfo>();
  for (const node of graph["@graph"]) {
    if (node["@type"] === "SportsTeam" && node["@id"] && (node as { name?: string }).name) {
      teams.set(node["@id"], {
        slug: node["@id"].replace(/^https?:\/\/[^/]+\/team\//, ""),
        name: (node as { name: string }).name,
      });
    }
  }
  const competitions = new Map<string, string>();
  for (const node of graph["@graph"]) {
    if (node["@type"] === "EventSeries" && node["@id"] && (node as { name?: string }).name) {
      competitions.set(node["@id"], (node as { name: string }).name);
    }
  }

  const out: Match[] = [];
  for (const node of graph["@graph"]) {
    if (node["@type"] !== "SportsEvent") continue;
    if (!node.startDate || !node["@id"]) continue;
    const homeId = node.homeTeam?.["@id"];
    const awayId = node.awayTeam?.["@id"];
    if (!homeId || !awayId) continue;
    const home = teams.get(homeId);
    const away = teams.get(awayId);
    if (!home || !away) continue;
    const homeIsUs = home.slug.startsWith(CLUB_SLUG);
    const awayIsUs = away.slug.startsWith(CLUB_SLUG);
    if (!homeIsUs && !awayIsUs) continue;
    const ourSlug = homeIsUs ? home.slug : away.slug;
    const team = svpTeamFromSlug(ourSlug);
    if (!team) continue;
    const leagueKey = leagueKeyForTeam(team);
    const compName = node.superEvent?.["@id"]
      ? competitions.get(node.superEvent["@id"])
      : undefined;
    const slug = node["@id"].replace(/^https?:\/\/[^/]+\/match\//, "");
    out.push({
      id: `fupa-${slug}`,
      leagueKey,
      homeTeamName: home.name,
      awayTeamName: away.name,
      involvesSvp: true,
      tippable: false,
      team,
      opponent: homeIsUs ? away.name : home.name,
      homeAway: homeIsUs ? "home" : "away",
      kickoff: node.startDate,
      league: compName ?? LEAGUE_LABELS[leagueKey],
      location: node.location?.name,
      source: "fupa",
      scrapedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

export async function fetchUpcomingMatches(): Promise<Match[]> {
  const html = await fetchText(`https://www.fupa.net/club/${CLUB_SLUG}/matches`);
  const matches: Match[] = [];
  const ldRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(ldRe)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed["@graph"])) {
        matches.push(...findUpcoming(parsed as FupaJsonLdGraph));
      }
    } catch {
      // ignore malformed ld+json blocks
    }
  }
  return matches;
}

export async function fetchPastMatchesForTeam(team: TeamId): Promise<Match[]> {
  const teamSlug = `${CLUB_SLUG}-m${team}-2025-26`;
  const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
  const leagueKey = leagueKeyForTeam(team);
  try {
    const data = await fetchJSON<FupaTeamMatch[]>(url);
    const out: Match[] = [];
    for (const m of data) {
      const homeIsUs = m.homeTeam.slug.startsWith(CLUB_SLUG);
      const awayIsUs = m.awayTeam.slug.startsWith(CLUB_SLUG);
      if (!homeIsUs && !awayIsUs) continue;
      const hasResult =
        typeof m.homeGoal === "number" && typeof m.awayGoal === "number";
      out.push({
        id: `fupa-${m.slug}`,
        leagueKey,
        round: m.round?.number,
        homeTeamName: m.homeTeam.name.full,
        awayTeamName: m.awayTeam.name.full,
        involvesSvp: true,
        tippable: false,
        team,
        opponent: homeIsUs ? m.awayTeam.name.full : m.homeTeam.name.full,
        homeAway: homeIsUs ? "home" : "away",
        kickoff: m.kickoff,
        league: m.competition?.name ?? m.round?.competitionSeason?.name ?? LEAGUE_LABELS[leagueKey],
        result: hasResult ? { homeGoals: m.homeGoal!, awayGoals: m.awayGoal! } : undefined,
        source: "fupa",
        scrapedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return out;
  } catch (e) {
    console.error("[scraper] past fetch failed", team, e);
    return [];
  }
}

export async function fetchAllMatches(): Promise<Match[]> {
  const [league, upcoming] = await Promise.all([
    fetchAllLeagueMatches(),
    fetchUpcomingMatches().catch((e) => {
      console.error("[scraper] upcoming failed", e);
      return [] as Match[];
    }),
  ]);

  const byId = new Map<string, Match>();
  for (const m of [...league, ...upcoming]) {
    const existing = byId.get(m.id);
    if (!existing) {
      byId.set(m.id, m);
      continue;
    }
    const merged: Match = {
      ...existing,
      ...m,
      result: m.result ?? existing.result,
      round: m.round ?? existing.round,
      kickoff: m.kickoff || existing.kickoff,
      updatedAt: new Date().toISOString(),
    };
    byId.set(m.id, merged);
  }
  return [...byId.values()];
}
