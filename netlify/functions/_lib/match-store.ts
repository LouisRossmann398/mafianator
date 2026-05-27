import { getStore } from "@netlify/blobs";
import { stores$ } from "./blobs.ts";
import type { Match } from "@shared/types";

const BULK_KEY = "__all__";
const MATCHES_STORE = "mafianator-matches";

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

/** Alle Spiele laden (ein Blob – kein langsames Einzel-Listing). */
export async function loadAllMatches(): Promise<Match[]> {
  const bulk = (await stores$.matches().get(BULK_KEY)) as unknown;
  if (isMatchBulk(bulk)) return bulk.matches;

  const metaBulk = (await stores$.meta().get("matches-bulk")) as unknown;
  if (isMatchBulk(metaBulk)) return metaBulk.matches;

  return [];
}

export async function saveAllMatches(matches: Match[]): Promise<void> {
  const payload: MatchBulk = {
    matches,
    updatedAt: new Date().toISOString(),
  };

  try {
    await stores$.matches().set(BULK_KEY, payload as never);
    await stores$.meta().set("matches-bulk", payload as never);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("too large") || message.includes("size")) {
      throw new Error(
        `Spieldaten zu gross fuer Speicher (${matches.length} Spiele). Bitte Netlify Support.`,
      );
    }
    throw e;
  }
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
  const bulk = (await stores$.matches().get(BULK_KEY)) as unknown;
  if (isMatchBulk(bulk)) return bulk.matches.length;
  const metaBulk = (await stores$.meta().get("matches-bulk")) as unknown;
  if (isMatchBulk(metaBulk)) return metaBulk.matches.length;
  return 0;
}

/** Entfernt alte Einzel-Match-Blobs (Migration nach Bulk-Speicher). */
export async function cleanupLegacyMatchBlobs(): Promise<number> {
  const store = getStore({ name: MATCHES_STORE, consistency: "strong" });
  const { blobs } = await store.list();
  let removed = 0;
  for (const blob of blobs) {
    if (blob.key === BULK_KEY) continue;
    await store.delete(blob.key);
    removed += 1;
  }
  return removed;
}
