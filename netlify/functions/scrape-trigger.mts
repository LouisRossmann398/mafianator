import { requireAuth } from "./_lib/auth.ts";
import { json, notAllowed } from "./_lib/response.ts";
import { runScrape } from "./scrape-matches.mts";
import { stores$ } from "./_lib/blobs.ts";

export default async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const status = await stores$.meta().get("scrape-status");
    return json({ status: status ?? null });
  }
  if (req.method !== "POST") return notAllowed(["POST", "GET"]);

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const status = await runScrape({ skipUpcoming: true });
    return json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[scrape-trigger] failed", e);
    const status = {
      lastRun: new Date().toISOString(),
      matchesTotal: 0,
      matchesUpdated: 0,
      matchesCreated: 0,
      lastError: message,
    };
    await stores$.meta().set("scrape-status", status as never);
    return json({ status });
  }
};

export const config = {
  path: "/api/scrape-trigger",
};
