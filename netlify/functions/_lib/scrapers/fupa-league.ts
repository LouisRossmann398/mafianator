import {
  CLUB_SLUG,
  COMPETITION_SLUGS,
  LEAGUE_LABELS,
  involvesSvpSlug,
  svpTeamFromSlug,
} from "@shared/leagues.ts";
import type { LeagueKey, Match, TeamId } from "@shared/types";
import { fupaFetchJSON, mapPool } from "./fupa-client.ts";
import { getFupaSeasonSlug } from "./fupa-season.ts";

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

function isCompetitionMatch(m: FupaTeamMatch, competitionSlug: string): boolean {
  return m.competition?.slug === competitionSlug;
}

function seedSlugForLeague(leagueKey: LeagueKey, season: string): string {
  const teamNum = leagueKey === "kreisklasse" ? "m1" : "m2";
  return `${CLUB_SLUG}-${teamNum}-${season}`;
}

/** Team-Slugs der Staffel aus FuPa (Wettbewerb + optional BFS). */
export async function discoverTeamSlugs(leagueKey: LeagueKey, season: string): Promise<string[]> {
  const competitionSlug = COMPETITION_SLUGS[leagueKey];
  const slugs = new Set<string>([seedSlugForLeague(leagueKey, season)]);

  try {
    const compUrl = `https://api.fupa.net/v1/competitions/${competitionSlug}/seasons/${season}/matches?flavor=past`;
    const compMatches = await fupaFetchJSON<FupaTeamMatch[]>(compUrl);
    for (const m of compMatches) {
      if (!isCompetitionMatch(m, competitionSlug)) continue;
      slugs.add(m.homeTeam.slug);
      slugs.add(m.awayTeam.slug);
    }
  } catch (e) {
    console.warn("[scraper] competition bootstrap failed", competitionSlug, e);
  }

  const queue = [...slugs];
  const discovered = new Set(slugs);
  while (queue.length > 0) {
    const teamSlug = queue.shift()!;
    try {
      const data = await fupaFetchJSON<FupaTeamMatch[]>(
        `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`,
      );
      for (const m of data) {
        if (!isCompetitionMatch(m, competitionSlug)) continue;
        for (const s of [m.homeTeam.slug, m.awayTeam.slug]) {
          if (!discovered.has(s)) {
            discovered.add(s);
            queue.push(s);
          }
        }
      }
    } catch (e) {
      console.error("[scraper] discovery fetch failed", teamSlug, e);
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
  const season = await getFupaSeasonSlug();
  const competitionSlug = COMPETITION_SLUGS[leagueKey];
  const teamSlugs = await discoverTeamSlugs(leagueKey, season);
  const byId = new Map<string, Match>();

  await mapPool(teamSlugs, 6, async (teamSlug) => {
    const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
    try {
      const data = await fupaFetchJSON<FupaTeamMatch[]>(url);
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
  });

  return [...byId.values()];
}

export async function fetchAllLeagueMatches(): Promise<Match[]> {
  const [kk, ck] = await Promise.all([
    fetchLeagueMatches("kreisklasse"),
    fetchLeagueMatches("c-klasse"),
  ]);
  return [...kk, ...ck];
}
