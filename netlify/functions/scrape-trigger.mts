import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { runScrape } from "./scrape-matches.mts";

export default async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const { stores$ } = await import("./_lib/blobs.ts");
    const status = await stores$.meta().get("scrape-status");
    return json({ status });
  }
  if (req.method !== "POST") return notAllowed(["POST", "GET"]);
  const auth = await requireAuth(req, ["admin"]);
  if (!auth.ok) return auth.response;
  try {
    const status = await runScrape();
    return json({ status });
  } catch (e) {
    return error(500, e instanceof Error ? e.message : "Scrape fehlgeschlagen");
  }
};

export const config = {
  path: "/api/scrape-trigger",
};
