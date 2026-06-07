import { TIP_SEASON_ID } from "@shared/leagues";
import type { LeagueMatch } from "@shared/types";
import { stores$ } from "./blobs.ts";

function bulkKey(seasonId = TIP_SEASON_ID): string {
  return `__bfv_${seasonId}__`;
}

interface LeagueMatchBulk {
  matches: LeagueMatch[];
  updatedAt: string;
  seasonId: string;
}

function isBulk(value: unknown): value is LeagueMatchBulk {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as LeagueMatchBulk).matches)
  );
}

export async function loadLeagueMatches(seasonId = TIP_SEASON_ID): Promise<LeagueMatch[]> {
  const bulk = (await stores$.leagueMatches().get(bulkKey(seasonId))) as unknown;
  if (isBulk(bulk)) return bulk.matches;
  return [];
}

export async function saveLeagueMatches(
  matches: LeagueMatch[],
  seasonId = TIP_SEASON_ID,
): Promise<void> {
  const payload: LeagueMatchBulk = {
    matches,
    seasonId,
    updatedAt: new Date().toISOString(),
  };
  await stores$.leagueMatches().set(bulkKey(seasonId), payload as never);
}

export async function getLeagueMatchById(id: string): Promise<LeagueMatch | null> {
  const all = await loadLeagueMatches();
  return all.find((m) => m.id === id) ?? null;
}
