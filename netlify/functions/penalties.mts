import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { newId } from "./_lib/ids.ts";
import { roundCents } from "./_lib/balance.ts";
import type { Penalty } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const all = await stores$.penalties().all();
    const playerId = url.searchParams.get("playerId");
    const filtered = playerId ? all.filter((p) => p.playerId === playerId) : all;
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ penalties: filtered });
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
    const payload = body as Partial<Penalty>;
    if (!payload.playerId || typeof payload.amount !== "number" || !payload.reason) {
      return error(400, "playerId, amount und reason sind Pflicht");
    }
    if (payload.amount <= 0) return error(400, "Betrag muss positiv sein");

    const player = await stores$.players().get(payload.playerId);
    if (!player) return error(404, "Spieler nicht gefunden");

    const canGamble =
      typeof payload.canGamble === "boolean"
        ? payload.canGamble && payload.amount < 10
        : payload.amount < 10;

    const penalty: Penalty = {
      id: newId(),
      playerId: payload.playerId,
      amount: roundCents(payload.amount),
      reason: payload.reason,
      catalogId: payload.catalogId,
      canGamble,
      createdBy: auth.user.username,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    await stores$.penalties().set(penalty.id, penalty);
    return json({ penalty }, 201);
  }

  if (req.method === "PATCH") {
    const auth = await requireAuth(req, ["admin", "treasurer"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const existing = await stores$.penalties().get(id);
    if (!existing) return error(404, "Strafe nicht gefunden");
    const payload = body as { action?: string; amount?: number; reason?: string };
    if (payload.action === "mark-paid") {
      if (existing.status === "paid") return json({ penalty: existing });
      const updated: Penalty = {
        ...existing,
        status: "paid",
        paidAt: new Date().toISOString(),
      };
      await stores$.penalties().set(id, updated);
      return json({ penalty: updated });
    }
    if (payload.action === "reopen") {
      const updated: Penalty = {
        ...existing,
        status: "open",
        paidAt: undefined,
      };
      await stores$.penalties().set(id, updated);
      return json({ penalty: updated });
    }
    if (payload.action === "edit") {
      const updated: Penalty = {
        ...existing,
        amount: typeof payload.amount === "number" ? roundCents(payload.amount) : existing.amount,
        reason: payload.reason ?? existing.reason,
      };
      await stores$.penalties().set(id, updated);
      return json({ penalty: updated });
    }
    return error(400, "Unbekannte Aktion");
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.penalties().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PATCH", "DELETE"]);
};

export const config = {
  path: "/api/penalties",
};
