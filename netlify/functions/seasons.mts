import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { getCurrentSeason } from "./_lib/balance.ts";
import { getStore } from "@netlify/blobs";
import type { Season } from "@shared/types";

async function archiveCurrentSeason(seasonId: string): Promise<{ archived: number }> {
  const sourceNames = ["penalties", "goodDeeds", "bets", "achievements"] as const;
  let archived = 0;
  for (const name of sourceNames) {
    const source = getStore({ name: `mafianator-${name}`, consistency: "strong" });
    const archive = getStore({
      name: `mafianator-archive-${seasonId}-${name}`,
      consistency: "strong",
    });
    const items = await source.list();
    for (const blob of items.blobs) {
      const value = await source.get(blob.key, { type: "json" });
      if (value === null || value === undefined) continue;
      await archive.setJSON(blob.key, value as unknown);
      await source.delete(blob.key);
      archived += 1;
    }
  }
  return { archived };
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const all = await stores$.seasons().all();
    all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return json({ seasons: all, current: await getCurrentSeason() });
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
    const payload = body as { action?: string; name?: string; startBalance?: number; id?: string };

    if (payload.action === "start-new") {
      const current = await getCurrentSeason();
      const archiveSummary = await archiveCurrentSeason(current.id);
      await stores$.seasons().set(current.id, { ...current, active: false, endedAt: new Date().toISOString() });
      const newId = payload.id ?? `season-${Date.now()}`;
      const startBalance = typeof payload.startBalance === "number" ? payload.startBalance : -100;
      const next: Season = {
        id: newId,
        name: payload.name ?? "Neue Saison",
        startedAt: new Date().toISOString(),
        startBalance,
        active: true,
      };
      await stores$.seasons().set(next.id, next);
      return json({ season: next, archived: archiveSummary.archived });
    }

    return error(400, "Unbekannte Aktion");
  }

  return notAllowed(["GET", "POST"]);
};

export const config = {
  path: "/api/seasons",
};
