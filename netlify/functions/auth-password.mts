import bcrypt from "bcryptjs";
import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return notAllowed(["POST"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Ungueltiges JSON");
  }
  if (!body || typeof body !== "object") return error(400, "Ungueltiger Request");
  const { oldPassword, newPassword } = body as { oldPassword?: string; newPassword?: string };
  if (!oldPassword || !newPassword) return error(400, "Beide Felder sind Pflicht");
  if (newPassword.length < 6) return error(400, "Neues Passwort muss mind. 6 Zeichen lang sein");

  const ok = await bcrypt.compare(oldPassword, auth.user.passwordHash);
  if (!ok) return error(401, "Altes Passwort falsch");

  const newHash = await bcrypt.hash(newPassword, 12);
  await stores$.users().set(auth.user.username, { ...auth.user, passwordHash: newHash });
  return json({ ok: true });
};

export const config = {
  path: "/api/auth-password",
};
