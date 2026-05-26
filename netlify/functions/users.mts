import bcrypt from "bcryptjs";
import { stores$ } from "./_lib/blobs.ts";
import { requireAuth, toPublic } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import type { Role, UserRecord } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  if (req.method === "GET") {
    const auth = await requireAuth(req, ["admin", "treasurer"]);
    if (!auth.ok) return auth.response;
    const users = await stores$.users().all();
    return json({ users: users.map(toPublic) });
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
    const payload = body as Partial<UserRecord> & { password?: string };
    if (!payload.username || !payload.password || !payload.role || !payload.displayName) {
      return error(400, "username, password, role und displayName sind Pflicht");
    }
    const uname = payload.username.trim().toLowerCase();
    const existing = await stores$.users().get(uname);
    if (existing) return error(409, "User existiert bereits");
    const newUser: UserRecord = {
      username: uname,
      displayName: payload.displayName,
      passwordHash: bcrypt.hashSync(payload.password, 12),
      role: payload.role as Role,
      playerId: payload.playerId ?? uname,
    };
    await stores$.users().set(uname, newUser);
    return json({ user: toPublic(newUser) }, 201);
  }

  if (req.method === "PUT") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!username) return error(400, "username fehlt");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<UserRecord> & { password?: string };
    const existing = await stores$.users().get(username);
    if (!existing) return error(404, "User nicht gefunden");
    const updated: UserRecord = {
      ...existing,
      displayName: payload.displayName ?? existing.displayName,
      role: (payload.role as Role) ?? existing.role,
      playerId: payload.playerId ?? existing.playerId,
      passwordHash: payload.password ? bcrypt.hashSync(payload.password, 12) : existing.passwordHash,
    };
    await stores$.users().set(username, updated);
    return json({ user: toPublic(updated) });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!username) return error(400, "username fehlt");
    if (username === auth.user.username) {
      return error(400, "Du kannst dich nicht selbst loeschen");
    }
    await stores$.users().delete(username);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PUT", "DELETE"]);
};

export const config = {
  path: "/api/users",
};
