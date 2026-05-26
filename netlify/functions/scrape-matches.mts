import type { Config } from "@netlify/functions";
import { stores$ } from "./_lib/blobs.ts";
import { fetchAllMatches } from "./_lib/scrapers/fupa.ts";
import type { Match } from "@shared/types";

interface ScrapeStatus {
  lastRun: string;
  lastError?: string;
  matchesTotal: number;
  matchesUpdated: number;
  matchesCreated: number;
}

export async function runScrape(): Promise<ScrapeStatus> {
  const fetched = await fetchAllMatches();
  let updated = 0;
  let created = 0;
  const store = stores$.matches();
  for (const m of fetched) {
    const existing = await store.get(m.id);
    if (!existing) {
      await store.set(m.id, m);
      created += 1;
      continue;
    }
    if (existing.source === "manual" && existing.result) {
      continue;
    }
    const merged: Match = {
      ...existing,
      ...m,
      result: m.result ?? existing.result,
      updatedAt: new Date().toISOString(),
    };
    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
      await store.set(m.id, merged);
      updated += 1;
    }
  }
  const status: ScrapeStatus = {
    lastRun: new Date().toISOString(),
    matchesTotal: fetched.length,
    matchesUpdated: updated,
    matchesCreated: created,
  };
  await stores$.meta().set("scrape-status", status as never);
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
