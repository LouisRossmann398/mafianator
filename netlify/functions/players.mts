import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { slugify } from "./_lib/ids.ts";
import type { Player, TeamId } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (id) {
      const player = await stores$.players().get(id);
      if (!player) return error(404, "Spieler nicht gefunden");
      return json({ player });
    }
    const all = await stores$.players().all();
    all.sort((a, b) => a.name.localeCompare(b.name, "de"));
    return json({ players: all });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<Player>;
    if (!payload.name || !payload.team) return error(400, "Name und Team sind Pflicht");
    const newId = slugify(payload.name);
    if (!newId) return error(400, "Ungueltiger Name");
    const existing = await stores$.players().get(newId);
    if (existing) return error(409, "Spieler existiert bereits");
    const player: Player = {
      id: newId,
      name: payload.name,
      team: payload.team as TeamId,
      birthdate: payload.birthdate,
      jerseyNumber: payload.jerseyNumber,
      avatarSeed: payload.avatarSeed ?? newId,
      active: payload.active ?? true,
    };
    await stores$.players().set(newId, player);
    return json({ player }, 201);
  }

  if (req.method === "PUT") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const existing = await stores$.players().get(id);
    if (!existing) return error(404, "Spieler nicht gefunden");
    const payload = body as Partial<Player>;
    const updated: Player = {
      ...existing,
      name: payload.name ?? existing.name,
      team: (payload.team as TeamId) ?? existing.team,
      birthdate: payload.birthdate ?? existing.birthdate,
      jerseyNumber: payload.jerseyNumber ?? existing.jerseyNumber,
      avatarSeed: payload.avatarSeed ?? existing.avatarSeed,
      active: payload.active ?? existing.active,
    };
    await stores$.players().set(id, updated);
    return json({ player: updated });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.players().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PUT", "DELETE"]);
};

export const config = {
  path: "/api/players",
};
