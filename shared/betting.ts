import type { LeagueKey, Match } from "./types.ts";
import { normalizeMatch } from "./leagues.ts";

export function groupMatchesByRound(matches: Match[], leagueKey: LeagueKey): Map<number, Match[]> {
  const normalized = matches.map(normalizeMatch).filter((m) => m.leagueKey === leagueKey);
  const byRound = new Map<number, Match[]>();
  for (const m of normalized) {
    const round = m.round ?? 0;
    if (round <= 0) continue;
    const list = byRound.get(round) ?? [];
    list.push(m);
    byRound.set(round, list);
  }
  for (const [, list] of byRound) {
    list.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  }
  return byRound;
}

export function sortedRounds(matches: Match[], leagueKey: LeagueKey): number[] {
  return [...groupMatchesByRound(matches, leagueKey).keys()].sort((a, b) => a - b);
}

/** Erster Spieltag mit zukünftigen oder noch offenen Spielen, sonst letzter Spieltag. */
export function defaultRoundIndex(rounds: number[], matches: Match[], leagueKey: LeagueKey): number {
  if (rounds.length === 0) return 0;
  const now = Date.now();
  const byRound = groupMatchesByRound(matches, leagueKey);
  for (let i = 0; i < rounds.length; i++) {
    const list = byRound.get(rounds[i]!) ?? [];
    const hasOpen = list.some(
      (m) => !m.result || new Date(m.kickoff).getTime() > now - 2 * 60 * 60_000,
    );
    if (hasOpen) return i;
  }
  return rounds.length - 1;
}

export function isMatchOpenForTips(match: Match): boolean {
  const m = normalizeMatch(match);
  if (!m.tippable) return false;
  if (m.result) return false;
  return new Date(m.kickoff).getTime() > Date.now();
}
