import type { Config } from "@netlify/functions";
import { stores$ } from "./_lib/blobs.ts";
import { loadAllMatches } from "./_lib/match-store.ts";
import { calcPoints } from "./_lib/scoring.ts";

export async function runEvaluation(): Promise<{
  evaluated: number;
  reEvaluated: number;
}> {
  const [matches, bets] = await Promise.all([loadAllMatches(), stores$.bets().all()]);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  let evaluated = 0;
  let reEvaluated = 0;
  for (const bet of bets) {
    const match = matchById.get(bet.matchId);
    if (!match || !match.result) continue;
    const points = calcPoints(
      { homeGoals: bet.homeGoals, awayGoals: bet.awayGoals },
      match.result,
    );
    if (bet.points === points && bet.evaluatedAt) continue;
    if (bet.evaluatedAt) reEvaluated += 1;
    else evaluated += 1;
    await stores$.bets().set(bet.id, {
      ...bet,
      points,
      evaluatedAt: new Date().toISOString(),
    });
  }
  return { evaluated, reEvaluated };
}

export default async (_req: Request): Promise<Response> => {
  try {
    const stats = await runEvaluation();
    await stores$.meta().set("evaluate-status", {
      lastRun: new Date().toISOString(),
      ...stats,
    } as never);
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[evaluate-bets] failed", e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "0 */2 * * *",
};
