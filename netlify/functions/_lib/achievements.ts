import { stores$ } from "./blobs.ts";
import { computeBalanceFor } from "./balance.ts";
import type { Achievement, AchievementsRecord } from "@shared/types";

export interface ComputedBadges {
  unlocked: string[];
  stats: AchievementsRecord["stats"];
}

export async function computeBadges(playerId: string, userId: string): Promise<ComputedBadges> {
  const [penalties, goodDeeds, balance] = await Promise.all([
    stores$.penalties().all().then((all) => all.filter((p) => p.playerId === playerId)),
    stores$.goodDeeds().all().then((all) => all.filter((g) => g.playerId === playerId)),
    computeBalanceFor(playerId),
  ]);

  const unlocked = new Set<string>();
  const penaltiesAmount = penalties.reduce((sum, p) => {
    if (p.status === "gambled-won") return sum;
    return sum + p.amount;
  }, 0);
  const goodDeedsAmount = goodDeeds.reduce((sum, g) => sum + g.amount, 0);
  const gamblesWon = penalties.filter((p) => p.gambleResult === "won").length;
  const gamblesLost = penalties.filter((p) => p.gambleResult === "lost").length;

  if (penalties.length >= 1) unlocked.add("first-penalty");
  if (gamblesWon >= 5) unlocked.add("wheel-master");

  const gambles = penalties
    .filter((p) => p.gambledAt)
    .sort((a, b) => (a.gambledAt ?? "").localeCompare(b.gambledAt ?? ""));
  let lossStreak = 0;
  let maxLossStreak = 0;
  for (const g of gambles) {
    if (g.gambleResult === "lost") {
      lossStreak += 1;
      maxLossStreak = Math.max(maxLossStreak, lossStreak);
    } else {
      lossStreak = 0;
    }
  }
  if (maxLossStreak >= 3) unlocked.add("wheel-loser");
  if (gamblesLost >= 1) unlocked.add("doubled-up");

  const sortedPen = penalties
    .filter((p) => p.status !== "gambled-won")
    .map((p) => new Date(p.createdAt))
    .sort((a, b) => a.getTime() - b.getTime());
  let longestStreakDays = 0;
  if (sortedPen.length === 0) {
    longestStreakDays = Math.floor((Date.now() - 0) / (24 * 60 * 60_000));
  } else {
    for (let i = 0; i < sortedPen.length - 1; i++) {
      const diff = sortedPen[i + 1].getTime() - sortedPen[i].getTime();
      const days = Math.floor(diff / (24 * 60 * 60_000));
      if (days > longestStreakDays) longestStreakDays = days;
    }
    const trailing = Math.floor(
      (Date.now() - sortedPen[sortedPen.length - 1].getTime()) / (24 * 60 * 60_000),
    );
    if (trailing > longestStreakDays) longestStreakDays = trailing;
  }
  if (longestStreakDays >= 30) unlocked.add("saint");

  const byMonth = new Map<string, number>();
  for (const g of goodDeeds) {
    const key = g.createdAt.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  if ([...byMonth.values()].some((n) => n >= 3)) unlocked.add("good-samaritan");

  if (balance.balance > balance.startBalance) unlocked.add("first-cash");

  const stats: AchievementsRecord["stats"] = {
    penaltiesTotal: penalties.length,
    penaltiesAmount,
    goodDeedsTotal: goodDeeds.length,
    goodDeedsAmount,
    gamblesWon,
    gamblesLost,
    longestStreakPenaltyFreeDays: longestStreakDays,
  };

  return { unlocked: [...unlocked], stats };
}

export async function syncBadges(playerId: string, userId: string): Promise<AchievementsRecord> {
  const { unlocked, stats } = await computeBadges(playerId, userId);
  const existing = (await stores$.achievements().get(userId)) ?? null;
  const previous = new Set((existing?.badges ?? []).map((b) => b.id));
  const merged: Achievement[] = [
    ...(existing?.badges ?? []),
    ...unlocked
      .filter((id) => !previous.has(id))
      .map<Achievement>((id) => ({ id, unlockedAt: new Date().toISOString() })),
  ];
  const record: AchievementsRecord = {
    userId,
    badges: merged,
    stats,
  };
  await stores$.achievements().set(userId, record);
  return record;
}
