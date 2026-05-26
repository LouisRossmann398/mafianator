import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import { slugify } from "./_lib/ids.ts";
import type { CatalogEntry } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const items = await stores$.catalog().all();
    items.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label, "de"));
    return json({ entries: items });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, ["admin", "treasurer"]);
    if (!auth.ok) return auth.response;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const payload = body as Partial<CatalogEntry>;
    if (!payload.label || typeof payload.defaultAmount !== "number") {
      return error(400, "label und defaultAmount sind Pflicht");
    }
    const newId = slugify(payload.label);
    const entry: CatalogEntry = {
      id: newId,
      label: payload.label,
      defaultAmount: payload.defaultAmount,
      category: payload.category ?? "Sonstige",
      canGamble: payload.canGamble ?? payload.defaultAmount < 10,
    };
    await stores$.catalog().set(entry.id, entry);
    return json({ entry }, 201);
  }

  if (req.method === "PUT") {
    const auth = await requireAuth(req, ["admin", "treasurer"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error(400, "Ungueltiges JSON");
    }
    const existing = await stores$.catalog().get(id);
    if (!existing) return error(404, "Eintrag nicht gefunden");
    const payload = body as Partial<CatalogEntry>;
    const updated: CatalogEntry = {
      ...existing,
      label: payload.label ?? existing.label,
      defaultAmount: payload.defaultAmount ?? existing.defaultAmount,
      category: payload.category ?? existing.category,
      canGamble: typeof payload.canGamble === "boolean" ? payload.canGamble : existing.canGamble,
    };
    await stores$.catalog().set(id, updated);
    return json({ entry: updated });
  }

  if (req.method === "DELETE") {
    const auth = await requireAuth(req, ["admin"]);
    if (!auth.ok) return auth.response;
    if (!id) return error(400, "id fehlt");
    await stores$.catalog().delete(id);
    return json({ ok: true });
  }

  return notAllowed(["GET", "POST", "PUT", "DELETE"]);
};

export const config = {
  path: "/api/catalog",
};
