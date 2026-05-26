import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";
import { runEvaluation } from "./evaluate-bets.mts";

interface LeaderboardRow {
  userId: string;
  displayName: string;
  points: number;
  betsEvaluated: number;
  betsTotal: number;
  exact: number;
  goalDiff: number;
  tendency: number;
  miss: number;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  if (url.searchParams.get("evaluate") === "1") {
    await runEvaluation();
  }

  const [bets, users] = await Promise.all([stores$.bets().all(), stores$.users().all()]);

  const map = new Map<string, LeaderboardRow>();
  for (const u of users) {
    map.set(u.username, {
      userId: u.username,
      displayName: u.displayName,
      points: 0,
      betsEvaluated: 0,
      betsTotal: 0,
      exact: 0,
      goalDiff: 0,
      tendency: 0,
      miss: 0,
    });
  }

  for (const bet of bets) {
    const row = map.get(bet.userId);
    if (!row) continue;
    row.betsTotal += 1;
    if (bet.points === undefined || !bet.evaluatedAt) continue;
    row.betsEvaluated += 1;
    row.points += bet.points;
    if (bet.points === 3) row.exact += 1;
    else if (bet.points === 2) row.goalDiff += 1;
    else if (bet.points === 1) row.tendency += 1;
    else row.miss += 1;
  }

  const rows = [...map.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.goalDiff - a.goalDiff ||
      b.tendency - a.tendency,
  );
  return json({ rows });
};

export const config = {
  path: "/api/leaderboard",
};
