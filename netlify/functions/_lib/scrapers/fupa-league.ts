import {
  CLUB_SLUG,
  COMPETITION_SLUGS,
  LEAGUE_LABELS,
  SEASON_SUFFIX,
  involvesSvpSlug,
  svpSeedSlugForLeague,
  svpTeamFromSlug,
} from "@shared/leagues.ts";
import type { LeagueKey, Match, TeamId } from "@shared/types";

interface FupaTeamMatch {
  id: number;
  slug: string;
  homeTeam: { slug: string; name: { full: string } };
  awayTeam: { slug: string; name: { full: string } };
  kickoff: string;
  homeGoal: number | null;
  awayGoal: number | null;
  competition?: { slug?: string; name?: string };
  round?: { number?: number; competitionSeason?: { name?: string } };
  venue?: { name?: string };
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; Mafianator/1.0; +https://github.com/sv-petershausen)";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FuPa request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

function isCompetitionMatch(m: FupaTeamMatch, competitionSlug: string): boolean {
  return m.competition?.slug === competitionSlug;
}

/** Alle Team-Slugs einer Staffel über FuPa-API ermitteln (BFS ab SVP + Competition-Matches). */
export async function discoverTeamSlugs(leagueKey: LeagueKey): Promise<string[]> {
  const competitionSlug = COMPETITION_SLUGS[leagueKey];
  const discovered = new Set<string>();
  const queue: string[] = [];

  const addSlug = (slug: string) => {
    if (!discovered.has(slug)) {
      discovered.add(slug);
      queue.push(slug);
    }
  };

  addSlug(svpSeedSlugForLeague(leagueKey));

  try {
    const compUrl = `https://api.fupa.net/v1/competitions/${competitionSlug}/seasons/${SEASON_SUFFIX}/matches?flavor=past`;
    const compMatches = await fetchJSON<FupaTeamMatch[]>(compUrl);
    for (const m of compMatches) {
      if (!isCompetitionMatch(m, competitionSlug)) continue;
      addSlug(m.homeTeam.slug);
      addSlug(m.awayTeam.slug);
    }
  } catch (e) {
    console.warn("[scraper] competition matches bootstrap failed", competitionSlug, e);
  }

  while (queue.length > 0) {
    const teamSlug = queue.shift()!;
    const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
    try {
      const data = await fetchJSON<FupaTeamMatch[]>(url);
      for (const m of data) {
        if (!isCompetitionMatch(m, competitionSlug)) continue;
        for (const slug of [m.homeTeam.slug, m.awayTeam.slug]) {
          addSlug(slug);
        }
      }
    } catch (e) {
      console.error("[scraper] team discovery fetch failed", teamSlug, e);
    }
  }

  return [...discovered];
}

function fupaMatchToLeagueMatch(
  m: FupaTeamMatch,
  leagueKey: LeagueKey,
  competitionSlug: string,
): Match | null {
  if (!isCompetitionMatch(m, competitionSlug)) return null;

  const roundNum = m.round?.number;
  if (roundNum != null && (roundNum <= 0 || roundNum > 50)) return null;

  const involvesSvp = involvesSvpSlug(m.homeTeam.slug, m.awayTeam.slug);
  const team: TeamId | undefined = involvesSvp
    ? (svpTeamFromSlug(m.homeTeam.slug) ?? svpTeamFromSlug(m.awayTeam.slug) ?? undefined)
    : undefined;

  const homeIsSvp = m.homeTeam.slug.startsWith(CLUB_SLUG);
  const opponent = involvesSvp
    ? homeIsSvp
      ? m.awayTeam.name.full
      : m.homeTeam.name.full
    : undefined;

  const hasResult =
    typeof m.homeGoal === "number" && typeof m.awayGoal === "number";

  return {
    id: `fupa-${m.slug}`,
    leagueKey,
    round: roundNum,
    homeTeamName: m.homeTeam.name.full,
    awayTeamName: m.awayTeam.name.full,
    involvesSvp,
    tippable: !involvesSvp,
    kickoff: m.kickoff,
    location: m.venue?.name,
    league: m.competition?.name ?? m.round?.competitionSeason?.name ?? LEAGUE_LABELS[leagueKey],
    result: hasResult ? { homeGoals: m.homeGoal!, awayGoals: m.awayGoal! } : undefined,
    team,
    opponent,
    homeAway: team ? (homeIsSvp ? "home" : "away") : undefined,
    source: "fupa",
    scrapedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchLeagueMatches(leagueKey: LeagueKey): Promise<Match[]> {
  const competitionSlug = COMPETITION_SLUGS[leagueKey];
  const slugs = await discoverTeamSlugs(leagueKey);
  const byId = new Map<string, Match>();

  for (const teamSlug of slugs) {
    const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
    try {
      const data = await fetchJSON<FupaTeamMatch[]>(url);
      for (const m of data) {
        const conv = fupaMatchToLeagueMatch(m, leagueKey, competitionSlug);
        if (!conv) continue;
        const existing = byId.get(conv.id);
        if (!existing) {
          byId.set(conv.id, conv);
        } else if (!existing.result && conv.result) {
          byId.set(conv.id, { ...existing, ...conv });
        }
      }
    } catch (e) {
      console.error("[scraper] league team fetch failed", teamSlug, e);
    }
  }

  return [...byId.values()];
}

export async function fetchAllLeagueMatches(): Promise<Match[]> {
  const [kk, ck] = await Promise.all([
    fetchLeagueMatches("kreisklasse"),
    fetchLeagueMatches("c-klasse"),
  ]);
  return [...kk, ...ck];
}
