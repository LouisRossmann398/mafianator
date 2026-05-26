import { getStore, type Store } from "@netlify/blobs";

const STORE_PREFIX = "mafianator";

const stores = new Map<string, Store>();

function store(name: string): Store {
  const key = `${STORE_PREFIX}-${name}`;
  let s = stores.get(key);
  if (!s) {
    s = getStore({ name: key, consistency: "strong" });
    stores.set(key, s);
  }
  return s;
}

export interface BlobStore<T> {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<string[]>;
  all: () => Promise<T[]>;
}

export function createStore<T>(name: string): BlobStore<T> {
  const s = store(name);
  return {
    async get(key: string) {
      const value = await s.get(key, { type: "json" });
      return (value ?? null) as T | null;
    },
    async set(key: string, value: T) {
      await s.setJSON(key, value as unknown);
    },
    async delete(key: string) {
      await s.delete(key);
    },
    async list() {
      const result = await s.list();
      return result.blobs.map((b) => b.key);
    },
    async all() {
      const result = await s.list();
      const items = (await Promise.all(
        result.blobs.map((b) => s.get(b.key, { type: "json" })),
      )) as (T | null | undefined)[];
      return items.filter((x): x is T => x !== null && x !== undefined);
    },
  };
}

import type {
  UserRecord,
  Player,
  Penalty,
  GoodDeed,
  CatalogEntry,
  Match,
  Bet,
  Season,
  Birthday,
  AchievementsRecord,
} from "@shared/types";

export const stores$ = {
  users: () => createStore<UserRecord>("users"),
  players: () => createStore<Player>("players"),
  penalties: () => createStore<Penalty>("penalties"),
  goodDeeds: () => createStore<GoodDeed>("goodDeeds"),
  catalog: () => createStore<CatalogEntry>("catalog"),
  matches: () => createStore<Match>("matches"),
  bets: () => createStore<Bet>("bets"),
  seasons: () => createStore<Season>("seasons"),
  birthdays: () => createStore<Birthday>("birthdays"),
  achievements: () => createStore<AchievementsRecord>("achievements"),
  meta: () => createStore<unknown>("meta"),
};
