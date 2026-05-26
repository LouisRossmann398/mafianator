import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import type { Birthday } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const all = await stores$.birthdays().all();
    return json({ birthdays: all });
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
    const payload = body as Birthday;
    if (!payload.playerId || !payload.date) return error(400, "playerId und date sind Pflicht");
    await stores$.birthdays().set(payload.playerId, payload);
    return json({ birthday: payload });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!playerId) return error(400, "playerId fehlt");
    await stores$.birthdays().delete(playerId);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "DELETE"]);
};

export const config = {
  path: "/api/birthdays",
};
