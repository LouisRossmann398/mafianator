import { stores$ } from "./blobs.ts";
import type { Match } from "@shared/types";

const BULK_KEY = "__all__";

interface MatchBulk {
  matches: Match[];
  updatedAt: string;
}

function isMatchBulk(value: unknown): value is MatchBulk {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as MatchBulk).matches)
  );
}

export async function loadAllMatches(): Promise<Match[]> {
  const bulk = (await stores$.matches().get(BULK_KEY)) as unknown;
  if (isMatchBulk(bulk)) return bulk.matches;
  return [];
}

export async function saveAllMatches(matches: Match[]): Promise<void> {
  const payload: MatchBulk = {
    matches,
    updatedAt: new Date().toISOString(),
  };
  await stores$.matches().set(BULK_KEY, payload as never);
}

export async function getMatchById(id: string): Promise<Match | null> {
  const all = await loadAllMatches();
  return all.find((m) => m.id === id) ?? null;
}

export async function upsertMatch(match: Match): Promise<void> {
  const all = await loadAllMatches();
  const idx = all.findIndex((m) => m.id === match.id);
  if (idx >= 0) all[idx] = match;
  else all.push(match);
  await saveAllMatches(all);
}

export async function deleteMatchById(id: string): Promise<void> {
  const all = await loadAllMatches();
  await saveAllMatches(all.filter((m) => m.id !== id));
}
