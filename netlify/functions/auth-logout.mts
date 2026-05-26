import { clearSessionCookie } from "./_lib/auth.ts";
import { notAllowed } from "./_lib/response.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return notAllowed(["POST"]);
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearSessionCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

export const config = {
  path: "/api/auth-logout",
};
