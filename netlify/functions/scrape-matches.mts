import type { Config } from "@netlify/functions";
import { stores$ } from "./_lib/blobs.ts";
import { saveAllMatches, loadAllMatches } from "./_lib/match-store.ts";
import { fetchAllMatches } from "./_lib/scrapers/fupa.ts";
import type { Match } from "@shared/types";

interface ScrapeStatus {
  lastRun: string;
  lastError?: string;
  matchesTotal: number;
  matchesUpdated: number;
  matchesCreated: number;
  durationMs?: number;
}

export async function runScrape(): Promise<ScrapeStatus> {
  const started = Date.now();
  const fetched = await fetchAllMatches();
  console.info("[scrape] fetched", fetched.length, "matches from FuPa");

  if (fetched.length === 0) {
    const status: ScrapeStatus = {
      lastRun: new Date().toISOString(),
      matchesTotal: 0,
      matchesUpdated: 0,
      matchesCreated: 0,
      durationMs: Date.now() - started,
      lastError: "FuPa lieferte 0 Spiele – API evtl. blockiert oder Saison leer",
    };
    await stores$.meta().set("scrape-status", status as never);
    return status;
  }

  const existing = await loadAllMatches();
  const byId = new Map(existing.map((m) => [m.id, m]));
  let created = 0;
  let updated = 0;

  for (const m of fetched) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      created += 1;
      continue;
    }
    if (prev.source === "manual" && prev.result) continue;
    const merged: Match = {
      ...prev,
      ...m,
      result: m.result ?? prev.result,
      updatedAt: new Date().toISOString(),
    };
    if (JSON.stringify(prev) !== JSON.stringify(merged)) {
      byId.set(m.id, merged);
      updated += 1;
    }
  }

  const merged = [...byId.values()];
  await saveAllMatches(merged);

  const status: ScrapeStatus = {
    lastRun: new Date().toISOString(),
    matchesTotal: merged.length,
    matchesUpdated: updated,
    matchesCreated: created,
    durationMs: Date.now() - started,
  };
  await stores$.meta().set("scrape-status", status as never);
  console.info("[scrape] saved", status);
  return status;
}

export default async (_req: Request): Promise<Response> => {
  try {
    const status = await runScrape();
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[scrape-matches] failed", e);
    const status = {
      lastRun: new Date().toISOString(),
      matchesTotal: 0,
      matchesUpdated: 0,
      matchesCreated: 0,
      lastError: message,
    };
    await stores$.meta().set("scrape-status", status as never);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "@hourly",
};
