import { SignJWT, jwtVerify } from "jose";
import { stores$ } from "./blobs.ts";
import { error, json } from "./response.ts";
import type { Role, UserPublic, UserRecord } from "@shared/types";
import { ensureSeed } from "./seed.ts";

const COOKIE_NAME = "mafianator_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    throw new Error("JWT_SECRET ist nicht gesetzt");
  }
  return new TextEncoder().encode(raw);
}

export interface SessionPayload {
  sub: string;
  username: string;
  role: Role;
  playerId: string;
  displayName: string;
}

export async function createSessionCookie(user: UserRecord): Promise<string> {
  const token = await new SignJWT({
    username: user.username,
    role: user.role,
    playerId: user.playerId,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());

  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NETLIFY_DEV !== "true" && process.env.CONTEXT !== "dev") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      username: payload.sub,
      role: payload.role as Role,
      playerId: payload.playerId as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

export type AuthResult =
  | { ok: true; session: SessionPayload; user: UserRecord }
  | { ok: false; response: Response };

export async function requireAuth(req: Request, roles?: Role[]): Promise<AuthResult> {
  await ensureSeed();
  const session = await getSession(req);
  if (!session) {
    return { ok: false, response: error(401, "Nicht angemeldet") };
  }
  const user = await stores$.users().get(session.username);
  if (!user) {
    return { ok: false, response: error(401, "User nicht gefunden") };
  }
  if (roles && !roles.includes(user.role)) {
    return { ok: false, response: error(403, "Keine Berechtigung") };
  }
  return { ok: true, session, user };
}

export function toPublic(user: UserRecord): UserPublic {
  const { passwordHash: _ph, ...rest } = user;
  void _ph;
  return rest;
}

export { json };
