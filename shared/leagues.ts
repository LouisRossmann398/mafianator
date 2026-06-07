import type { LeagueKey, TeamId } from "./types";

export const TIP_SEASON_ID = "2526";
export const TIP_SEASON_LABEL = "25/26";

/** Saison abgeschlossen – Tipps auch nach Anpfiff erlaubt. */
export const RETROACTIVE_TIPS = true;

export const SVP_NAME = "SV Petershausen";

export const SVP_TEAM_IDS: Record<LeagueKey, string> = {
  kreisklasse: "016PB2OPSK000000VV0AG811VTE5EA5R",
  "c-klasse": "016PM67AOC000000VV0AG80NVUT1FLRU",
};

export const BFV_COMPOUND_IDS: Record<LeagueKey, string> = {
  kreisklasse: "02TJDL3B3O000035VS5489BTVV9SFN07-G",
  "c-klasse": "02TL12J2K400003DVS5489BTVV03720K-G",
};

export const LEAGUE_LABELS: Record<LeagueKey, string> = {
  kreisklasse: "Kreisklasse 1 München",
  "c-klasse": "C-Klasse 1 München",
};

export function svpTeamFromLeague(leagueKey: LeagueKey): TeamId {
  return leagueKey === "kreisklasse" ? 1 : 2;
}

export function involvesSvpName(home: string, away: string): boolean {
  const needle = "petershausen";
  return home.toLowerCase().includes(needle) || away.toLowerCase().includes(needle);
}

export function involvesSvpIds(
  homeId: string,
  awayId: string,
  leagueKey: LeagueKey,
): boolean {
  const svpId = SVP_TEAM_IDS[leagueKey];
  return homeId === svpId || awayId === svpId;
}
