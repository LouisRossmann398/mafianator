/** Häufige Fußballergebnisse (Heim : Gast). */
const COMMON_SCORES: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 0],
  [0, 2],
  [2, 1],
  [1, 2],
  [2, 2],
  [3, 0],
  [0, 3],
  [3, 1],
  [1, 3],
  [3, 2],
  [2, 3],
  [4, 1],
  [1, 4],
];

export function randomRealisticScore(): { homeGoals: number; awayGoals: number } {
  const [homeGoals, awayGoals] = COMMON_SCORES[Math.floor(Math.random() * COMMON_SCORES.length)]!;
  return { homeGoals, awayGoals };
}
