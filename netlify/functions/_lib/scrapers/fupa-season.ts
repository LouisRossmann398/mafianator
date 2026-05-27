import { COMPETITION_SLUGS, SEASON_SUFFIX } from "@shared/leagues.ts";
import type { LeagueKey } from "@shared/types";
import { fupaFetchJSON } from "./fupa-client.ts";

interface FupaCompetition {
  season?: { slug: string; name?: string };
}

let cachedSeason: string | null = null;

/** Aktuelle Saison von FuPa (Fallback: 2025-26). */
export async function getFupaSeasonSlug(): Promise<string> {
  if (cachedSeason) return cachedSeason;
  try {
    const kk = await fupaFetchJSON<FupaCompetition>(
      `https://api.fupa.net/v1/competitions/${COMPETITION_SLUGS.kreisklasse}`,
    );
    cachedSeason = kk.season?.slug ?? SEASON_SUFFIX;
  } catch (e) {
    console.warn("[scraper] season resolve failed, using default", e);
    cachedSeason = SEASON_SUFFIX;
  }
  return cachedSeason;
}

export function resetSeasonCache(): void {
  cachedSeason = null;
}
