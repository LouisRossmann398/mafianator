import type { Bet, LeagueKey, Match } from "./types.ts";
import { normalizeMatch } from "./leagues.ts";
import { calcPoints } from "./scoring.ts";

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

export function isMatchFinished(match: Match): boolean {
  return !!normalizeMatch(match).result;
}

export function pointsForBet(bet: Bet | undefined, match: Match): number | undefined {
  if (!bet || !match.result) return undefined;
  if (typeof bet.points === "number") return bet.points;
  return calcPoints(
    { homeGoals: bet.homeGoals, awayGoals: bet.awayGoals },
    match.result,
  );
}

export interface RoundStats {
  totalGames: number;
  tipped: number;
  evaluated: number;
  points: number;
  finished: boolean;
}

export function statsForRound(
  roundMatches: Match[],
  betFor: (matchId: string) => Bet | undefined,
): RoundStats {
  const tippable = roundMatches.filter((m) => m.tippable);
  let points = 0;
  let tipped = 0;
  let evaluated = 0;
  let finished = tippable.length > 0;

  for (const m of tippable) {
    if (!isMatchFinished(m)) finished = false;
    const bet = betFor(m.id);
    if (!bet) continue;
    tipped += 1;
    const p = pointsForBet(bet, m);
    if (p !== undefined) {
      evaluated += 1;
      points += p;
    }
  }

  return { totalGames: tippable.length, tipped, evaluated, points, finished };
}
