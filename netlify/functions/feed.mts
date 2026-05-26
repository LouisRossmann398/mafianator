import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";

interface FeedItem {
  id: string;
  type: "penalty" | "good-deed" | "gamble";
  playerId: string;
  amount: number;
  reason: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const playerId = url.searchParams.get("playerId");

  const [penalties, goodDeeds] = await Promise.all([
    stores$.penalties().all(),
    stores$.goodDeeds().all(),
  ]);

  const items: FeedItem[] = [];
  for (const p of penalties) {
    if (playerId && p.playerId !== playerId) continue;
    items.push({
      id: `penalty-${p.id}`,
      type: p.status === "gambled-won" || p.status === "doubled" ? "gamble" : "penalty",
      playerId: p.playerId,
      amount: p.status === "gambled-won" ? 0 : -p.amount,
      reason: p.reason,
      createdAt: p.gambledAt ?? p.createdAt,
      meta: {
        status: p.status,
        originalAmount: p.originalAmount,
        gambleResult: p.gambleResult,
      },
    });
  }
  for (const g of goodDeeds) {
    if (playerId && g.playerId !== playerId) continue;
    items.push({
      id: `gd-${g.id}`,
      type: "good-deed",
      playerId: g.playerId,
      amount: g.amount,
      reason: g.reason,
      createdAt: g.createdAt,
    });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json({ items: items.slice(0, Number.isFinite(limit) ? limit : 20) });
};

export const config = {
  path: "/api/feed",
};
