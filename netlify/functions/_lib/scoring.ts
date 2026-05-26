interface Score {
  homeGoals: number;
  awayGoals: number;
}

export function calcPoints(bet: Score, result: Score): number {
  if (bet.homeGoals === result.homeGoals && bet.awayGoals === result.awayGoals) return 3;
  const betDiff = bet.homeGoals - bet.awayGoals;
  const resDiff = result.homeGoals - result.awayGoals;
  if (betDiff === resDiff && betDiff !== 0) return 2;
  const betTendency = Math.sign(betDiff);
  const resTendency = Math.sign(resDiff);
  if (betTendency === resTendency) return 1;
  return 0;
}
