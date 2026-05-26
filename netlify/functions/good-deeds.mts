import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { newId } from "./_lib/ids.ts";
import { roundCents } from "./_lib/balance.ts";
import type { GoodDeed } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const all = await stores$.goodDeeds().all();
    const playerId = url.searchParams.get("playerId");
    const filtered = playerId ? all.filter((p) => p.playerId === playerId) : all;
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ goodDeeds: filtered });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, ["admin", "treasurer"]);
    if (!auth.ok) return auth.response;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<GoodDeed>;
    if (!payload.playerId || typeof payload.amount !== "number" || !payload.reason) {
      return error(400, "playerId, amount und reason sind Pflicht");
    }
    if (payload.amount <= 0) return error(400, "Betrag muss positiv sein");
    const player = await stores$.players().get(payload.playerId);
    if (!player) return error(404, "Spieler nicht gefunden");
    const gd: GoodDeed = {
      id: newId(),
      playerId: payload.playerId,
      amount: roundCents(payload.amount),
      reason: payload.reason,
      createdBy: auth.user.username,
      createdAt: new Date().toISOString(),
    };
    await stores$.goodDeeds().set(gd.id, gd);
    return json({ goodDeed: gd }, 201);
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.goodDeeds().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "DELETE"]);
};

export const config = {
  path: "/api/good-deeds",
};
