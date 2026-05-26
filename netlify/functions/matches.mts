import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { newId } from "./_lib/ids.ts";
import type { Match, TeamId } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const teamParam = url.searchParams.get("team");
  const upcoming = url.searchParams.get("upcoming");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    let matches = await stores$.matches().all();
    if (teamParam) {
      const team = Number(teamParam) as TeamId;
      matches = matches.filter((m) => m.team === team);
    }
    if (upcoming) {
      const now = Date.now();
      matches = matches.filter((m) => new Date(m.kickoff).getTime() >= now - 3 * 60 * 60_000);
      matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    } else {
      matches.sort((a, b) => b.kickoff.localeCompare(a.kickoff));
    }
    return json({ matches });
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
    const payload = body as Partial<Match>;
    if (!payload.opponent || !payload.kickoff || !payload.team || !payload.homeAway) {
      return error(400, "opponent, kickoff, team, homeAway sind Pflicht");
    }
    const match: Match = {
      id: newId(),
      team: payload.team as TeamId,
      opponent: payload.opponent,
      kickoff: payload.kickoff,
      homeAway: payload.homeAway,
      location: payload.location,
      league: payload.league ?? (payload.team === 1 ? "Kreisklasse 1 München" : "C-Klasse 1 München"),
      result: payload.result,
      source: "manual",
      updatedAt: new Date().toISOString(),
    };
    await stores$.matches().set(match.id, match);
    return json({ match }, 201);
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
    const existing = await stores$.matches().get(id);
    if (!existing) return error(404, "Match nicht gefunden");
    const payload = body as Partial<Match>;
    const updated: Match = {
      ...existing,
      ...payload,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    await stores$.matches().set(id, updated);
    return json({ match: updated });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.matches().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PUT", "DELETE"]);
};

export const config = {
  path: "/api/matches",
};
