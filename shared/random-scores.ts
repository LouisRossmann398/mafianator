import type { ScoreLine } from "./scoring.ts";

const COMMON: ScoreLine[] = [
  { homeGoals: 1, awayGoals: 0 },
  { homeGoals: 2, awayGoals: 0 },
  { homeGoals: 2, awayGoals: 1 },
  { homeGoals: 1, awayGoals: 1 },
  { homeGoals: 0, awayGoals: 0 },
  { homeGoals: 3, awayGoals: 1 },
  { homeGoals: 1, awayGoals: 2 },
  { homeGoals: 0, awayGoals: 1 },
  { homeGoals: 0, awayGoals: 2 },
  { homeGoals: 3, awayGoals: 0 },
];

export function randomRealisticScore(): ScoreLine {
  return COMMON[Math.floor(Math.random() * COMMON.length)]!;
}
