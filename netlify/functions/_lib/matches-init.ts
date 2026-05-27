import { stores$ } from "./blobs.ts";
import { runScrape } from "../scrape-matches.mts";

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
    console.warn("[matches-init] FuPa scrape returned no matches");
  } catch (error) {
    console.error("[matches-init] FuPa scrape failed", error);
  }
}
