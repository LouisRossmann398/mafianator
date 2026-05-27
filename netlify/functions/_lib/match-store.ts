import { stores$ } from "./blobs.ts";
import type { Match } from "@shared/types";

const BULK_KEY = "__all__";

interface MatchBulk {
  matches: Match[];
  updatedAt: string;
}

/** Alle Spiele laden (ein Blob – schnell auf Netlify). */
export async function loadAllMatches(): Promise<Match[]> {
  const bulk = (await stores$.matches().get(BULK_KEY)) as MatchBulk | null;
  if (bulk?.matches?.length) return bulk.matches;

  const legacy = await stores$.matches().all();
  const filtered = legacy.filter((m) => m.id !== BULK_KEY);
  return filtered;
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

export async function matchesCount(): Promise<number> {
  const bulk = (await stores$.matches().get(BULK_KEY)) as MatchBulk | null;
  if (bulk?.matches?.length) return bulk.matches.length;
  const keys = await stores$.matches().list();
  return keys.filter((k) => k !== BULK_KEY).length;
}
