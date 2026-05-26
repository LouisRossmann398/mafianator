import { stores$ } from "./blobs.ts";
import { runScrape } from "../scrape-matches.mts";
import type { Match } from "@shared/types";
import seedUpcoming from "../../../seed/matches-upcoming.json" with { type: "json" };

let populatePromise: Promise<void> | null = null;

export async function ensureMatchesPopulated(): Promise<void> {
  const existing = await stores$.matches().list();
  if (existing.length > 0) return;

  if (!populatePromise) {
    populatePromise = populateMatches().finally(() => {
      populatePromise = null;
    });
  }
  return populatePromise;
}

async function populateMatches(): Promise<void> {
  try {
    const status = await runScrape();
    if (status.matchesTotal > 0) return;
  } catch (error) {
    console.error("[matches-init] FuPa scrape failed, using seed fallback", error);
  }

  const stillEmpty = await stores$.matches().list();
  if (stillEmpty.length > 0) return;

  const store = stores$.matches();
  const now = new Date().toISOString();
  for (const match of seedUpcoming as Match[]) {
    await store.set(match.id, {
      ...match,
      scrapedAt: now,
      updatedAt: now,
    });
  }
}
