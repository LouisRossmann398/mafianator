import type { Match, TeamId } from "@shared/types";

interface FupaTeamMatch {
  id: number;
  slug: string;
  homeTeam: { slug: string; name: { full: string } };
  awayTeam: { slug: string; name: { full: string } };
  kickoff: string;
  homeGoal: number | null;
  awayGoal: number | null;
  competition?: { name?: string };
  round?: { competitionSeason?: { name?: string } };
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
  "@graph": (FupaJsonLdEvent & {
    name?: string;
  })[];
}

const CLUB_SLUG = "sv-petershausen";
const SEASON_SUFFIX = "2025-26";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Mafianator/1.0; +https://github.com/sv-petershausen)";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`FuPa request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`FuPa HTML request failed (${res.status}): ${url}`);
  return res.text();
}

function teamFromSlug(slug: string): TeamId | null {
  if (slug.includes(`${CLUB_SLUG}-m1`)) return 1;
  if (slug.includes(`${CLUB_SLUG}-m2`)) return 2;
  return null;
}

function leagueFor(team: TeamId, fallback?: string): string {
  if (fallback) return fallback;
  return team === 1 ? "Kreisklasse 1 München" : "C-Klasse 1 München";
}

function pastMatchToMatch(m: FupaTeamMatch): Match | null {
  const homeIsUs = m.homeTeam.slug.startsWith(CLUB_SLUG);
  const awayIsUs = m.awayTeam.slug.startsWith(CLUB_SLUG);
  if (!homeIsUs && !awayIsUs) return null;
  const ourSlug = homeIsUs ? m.homeTeam.slug : m.awayTeam.slug;
  const team = teamFromSlug(ourSlug);
  if (!team) return null;
  const opponent = homeIsUs ? m.awayTeam.name.full : m.homeTeam.name.full;
  const result =
    typeof m.homeGoal === "number" && typeof m.awayGoal === "number"
      ? {
          homeGoals: homeIsUs ? m.homeGoal : m.homeGoal,
          awayGoals: m.awayGoal,
        }
      : undefined;
  const finalResult = result
    ? {
        homeGoals: homeIsUs ? m.homeGoal! : m.awayGoal!,
        awayGoals: homeIsUs ? m.awayGoal! : m.homeGoal!,
      }
    : undefined;

  return {
    id: `fupa-${m.slug}`,
    team,
    opponent,
    homeAway: homeIsUs ? "home" : "away",
    kickoff: m.kickoff,
    league: leagueFor(team, m.competition?.name ?? m.round?.competitionSeason?.name),
    result: finalResult ?? undefined,
    source: "fupa",
    scrapedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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
    const team = teamFromSlug(ourSlug);
    if (!team) continue;
    const opponent = homeIsUs ? away.name : home.name;
    const compName = node.superEvent?.["@id"] ? competitions.get(node.superEvent["@id"]) : undefined;
    const slug = node["@id"].replace(/^https?:\/\/[^/]+\/match\//, "");
    out.push({
      id: `fupa-${slug}`,
      team,
      opponent,
      homeAway: homeIsUs ? "home" : "away",
      kickoff: node.startDate,
      league: leagueFor(team, compName),
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
  const teamSlug = `${CLUB_SLUG}-m${team}-${SEASON_SUFFIX}`;
  const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
  try {
    const data = await fetchJSON<FupaTeamMatch[]>(url);
    const out: Match[] = [];
    for (const m of data) {
      const conv = pastMatchToMatch(m);
      if (conv) out.push(conv);
    }
    return out;
  } catch (e) {
    console.error("[scraper] past fetch failed", team, e);
    return [];
  }
}

export async function fetchAllMatches(): Promise<Match[]> {
  const [past1, past2, upcoming] = await Promise.all([
    fetchPastMatchesForTeam(1),
    fetchPastMatchesForTeam(2),
    fetchUpcomingMatches().catch((e) => {
      console.error("[scraper] upcoming failed", e);
      return [] as Match[];
    }),
  ]);
  const byId = new Map<string, Match>();
  for (const m of [...past1, ...past2, ...upcoming]) {
    const existing = byId.get(m.id);
    if (!existing) {
      byId.set(m.id, m);
    } else if (!existing.result && m.result) {
      byId.set(m.id, { ...existing, ...m });
    }
  }
  return [...byId.values()];
}
