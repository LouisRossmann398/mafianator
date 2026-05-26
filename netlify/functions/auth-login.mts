import bcrypt from "bcryptjs";
import { stores$ } from "./_lib/blobs.ts";
import { createSessionCookie, toPublic } from "./_lib/auth.ts";
import { error, notAllowed } from "./_lib/response.ts";
import { ensureSeed } from "./_lib/seed.ts";

const attempts = new Map<string, { count: number; first: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60_000;

function track(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return notAllowed(["POST"]);
  await ensureSeed();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-nf-client-connection-ip") ??
    "unknown";

  if (!track(ip)) {
    return error(429, "Zu viele Versuche. Bitte später erneut probieren.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Ungueltiges JSON");
  }

  if (!body || typeof body !== "object") return error(400, "Ungueltiger Request");
  const { username, password } = body as { username?: string; password?: string };
  if (!username || !password) {
    return error(400, "Benutzername und Passwort sind Pflicht");
  }

  const user = await stores$.users().get(username.trim().toLowerCase());
  if (!user) {
    await bcrypt.compare(password, "$2a$12$abcdefghijklmnopqrstuv");
    return error(401, "Falscher Benutzername oder Passwort");
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return error(401, "Falscher Benutzername oder Passwort");
  }

  const cookie = await createSessionCookie(user);
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify({ user: toPublic(user) }), {
    status: 200,
    headers,
  });
};

export const config = {
  path: "/api/auth-login",
};

