import type { LeagueKey, Match, TeamId } from "./types";

export const CLUB_SLUG = "sv-petershausen";
export const SEASON_SUFFIX = "2025-26";

export const LEAGUE_LABELS: Record<LeagueKey, string> = {
  kreisklasse: "Kreisklasse 1 München",
  "c-klasse": "C-Klasse 1 München",
};

/** FuPa-Wettbewerbs-Slugs (API competition.slug) – keine Spieldaten. */
export const COMPETITION_SLUGS: Record<LeagueKey, string> = {
  kreisklasse: "muenchen-kreisklasse-1",
  "c-klasse": "muenchen-c-klasse-1",
};

/** Einstiegsteam pro Liga zum Auffinden aller Staffel-Teams über die API. */
export function svpSeedSlugForLeague(leagueKey: LeagueKey): string {
  const teamNum = leagueKey === "kreisklasse" ? "m1" : "m2";
  return `${CLUB_SLUG}-${teamNum}-${SEASON_SUFFIX}`;
}

export function svpTeamFromSlug(slug: string): TeamId | null {
  if (slug.startsWith(`${CLUB_SLUG}-m1`)) return 1;
  if (slug.startsWith(`${CLUB_SLUG}-m2`)) return 2;
  return null;
}

export function involvesSvpSlug(homeSlug: string, awaySlug: string): boolean {
  return homeSlug.startsWith(CLUB_SLUG) || awaySlug.startsWith(CLUB_SLUG);
}

const SVP_NAME = "SV Petershausen";

/** Legacy-Matches aus dem Store in das neue Schema bringen. */
export function normalizeMatch(raw: Match): Match {
  if (raw.homeTeamName && raw.awayTeamName && raw.leagueKey) return raw;

  const leagueKey =
    raw.leagueKey ??
    (raw.team === 1 ? "kreisklasse" : raw.team === 2 ? "c-klasse" : "kreisklasse");

  const involvesSvp =
    raw.involvesSvp ??
    (raw.team != null || (raw.opponent != null && raw.homeAway != null));

  let homeTeamName = raw.homeTeamName;
  let awayTeamName = raw.awayTeamName;
  if (!homeTeamName || !awayTeamName) {
    if (raw.homeAway === "home") {
      homeTeamName = SVP_NAME;
      awayTeamName = raw.opponent ?? "?";
    } else if (raw.homeAway === "away") {
      homeTeamName = raw.opponent ?? "?";
      awayTeamName = SVP_NAME;
    } else {
      homeTeamName = raw.opponent ?? "Heim";
      awayTeamName = "Gast";
    }
  }

  return {
    ...raw,
    leagueKey,
    homeTeamName,
    awayTeamName,
    involvesSvp,
    tippable: raw.tippable ?? !involvesSvp,
    league: raw.league ?? LEAGUE_LABELS[leagueKey],
  };
}
