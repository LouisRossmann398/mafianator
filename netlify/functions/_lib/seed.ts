import { stores$ } from "./blobs.ts";
import type {
  UserRecord,
  CatalogEntry,
  Player,
  Season,
} from "@shared/types";
import seedUsers from "../../../seed/users.json" with { type: "json" };
import seedCatalog from "../../../seed/catalog.json" with { type: "json" };
import seedPlayers from "../../../seed/players.json" with { type: "json" };

const SEED_VERSION = 2;
const META_KEY = "seed-version";

let cachedSeed: Promise<void> | null = null;

export function resetSeedCache(): void {
  cachedSeed = null;
}

export async function ensureSeed(): Promise<void> {
  if (!cachedSeed) {
    cachedSeed = runSeed().catch((err) => {
      cachedSeed = null;
      throw err;
    });
  }
  await cachedSeed;
}

async function runSeed(): Promise<void> {
  const meta = stores$.meta();
  const current = (await meta.get(META_KEY)) as { version: number } | null;
  if (current?.version === SEED_VERSION) return;

  const users = stores$.users();
  for (const u of seedUsers as UserRecord[]) {
    const existing = await users.get(u.username);
    if (!existing) {
      await users.set(u.username, u);
    }
  }

  await syncCatalogFromSeed();

  const players = stores$.players();
  for (const p of seedPlayers as Player[]) {
    const existing = await players.get(p.id);
    if (!existing) {
      await players.set(p.id, p);
    }
  }

  const seasons = stores$.seasons();
  const seasonId = "2025-26";
  const existingSeason = await seasons.get(seasonId);
  if (!existingSeason) {
    const initial: Season = {
      id: seasonId,
      name: "Saison 2025/26",
      startedAt: new Date().toISOString(),
      startBalance: 100,
      active: true,
    };
    await seasons.set(seasonId, initial);
    await meta.set("current-season", { id: seasonId } as never);
  }

  await meta.set(META_KEY, { version: SEED_VERSION } as never);
}

/** Katalog bei Seed-Update vollständig aus seed/catalog.json ersetzen. */
async function syncCatalogFromSeed(): Promise<void> {
  const catalog = stores$.catalog();
  const entries = seedCatalog as CatalogEntry[];
  const seedIds = new Set(entries.map((c) => c.id));
  for (const key of await catalog.list()) {
    if (!seedIds.has(key)) await catalog.delete(key);
  }
  for (const entry of entries) {
    await catalog.set(entry.id, entry);
  }
}
