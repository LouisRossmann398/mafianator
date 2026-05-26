import { requireAuth, toPublic } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return notAllowed(["GET"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  return json({ user: toPublic(auth.user) });
};

export const config = {
  path: "/api/auth-me",
};
