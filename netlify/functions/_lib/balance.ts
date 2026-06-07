import { stores$ } from "./blobs.ts";
import type { BalanceSummary, GoodDeed, Penalty, Season } from "@shared/types";

/** Muss mit shared/balance.ts übereinstimmen (kein @shared-Import in Functions). */
export const DEFAULT_SEASON_DEPOSIT = 100;

export function seasonDeposit(startBalance: number): number {
  return Math.abs(startBalance);
}

export async function getCurrentSeason(): Promise<Season> {
  const all = await stores$.seasons().all();
  const active = all.find((s) => s.active);
  if (active) return active;
  if (all.length === 0) {
    const fallback: Season = {
      id: "2025-26",
      name: "Saison 2025/26",
      startedAt: new Date().toISOString(),
      startBalance: DEFAULT_SEASON_DEPOSIT,
      active: true,
    };
    await stores$.seasons().set(fallback.id, fallback);
    return fallback;
  }
  return all[0];
}

export function effectivePenaltyImpact(p: Penalty): number {
  if (p.status === "gambled-won") return 0;
  if (p.status === "doubled") return -(p.amount);
  return -(p.amount);
}

export async function computeBalances(): Promise<Record<string, BalanceSummary>> {
  const [season, players, penalties, goodDeeds] = await Promise.all([
    getCurrentSeason(),
    stores$.players().all(),
    stores$.penalties().all(),
    stores$.goodDeeds().all(),
  ]);

  const deposit = seasonDeposit(season.startBalance);
  const map: Record<string, BalanceSummary> = {};
  for (const p of players) {
    map[p.id] = {
      playerId: p.id,
      startBalance: deposit,
      penaltiesSum: 0,
      goodDeedsSum: 0,
      balance: deposit,
    };
  }

  for (const pen of penalties) {
    const entry = map[pen.playerId];
    if (!entry) continue;
    const impact = effectivePenaltyImpact(pen);
    entry.penaltiesSum += -impact;
    entry.balance += impact;
  }

  for (const gd of goodDeeds) {
    const entry = map[gd.playerId];
    if (!entry) continue;
    entry.goodDeedsSum += gd.amount;
    entry.balance += gd.amount;
  }

  return map;
}

export async function computeBalanceFor(playerId: string): Promise<BalanceSummary> {
  const balances = await computeBalances();
  return (
    balances[playerId] ?? {
      playerId,
      startBalance: DEFAULT_SEASON_DEPOSIT,
      penaltiesSum: 0,
      goodDeedsSum: 0,
      balance: DEFAULT_SEASON_DEPOSIT,
    }
  );
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export type { Penalty, GoodDeed };
