import { randomInt } from "node:crypto";
import { stores$ } from "./_lib/blobs.ts";
import { requireAuth } from "./_lib/auth.ts";
import { error, json, notAllowed } from "./_lib/response.ts";
import type { Penalty } from "@shared/types";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return notAllowed(["POST"]);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return error(400, "id fehlt");

  const penalty = await stores$.penalties().get(id);
  if (!penalty) return error(404, "Strafe nicht gefunden");

  if (penalty.playerId !== auth.user.playerId) {
    return error(403, "Du kannst nur deine eigenen Strafen zocken");
  }
  if (penalty.status !== "open") {
    return error(400, "Strafe ist nicht mehr offen");
  }
  if (!penalty.canGamble || penalty.amount >= 10) {
    return error(400, "Diese Strafe kann nicht gezockt werden");
  }

  const roll = randomInt(0, 2);
  const won = roll === 0;
  const now = new Date().toISOString();
  const original = penalty.amount;

  const updated: Penalty = won
    ? {
        ...penalty,
        status: "gambled-won",
        gambledAt: now,
        gambleResult: "won",
        originalAmount: original,
      }
    : {
        ...penalty,
        status: "doubled",
        gambledAt: now,
        gambleResult: "lost",
        originalAmount: original,
        amount: Math.round(original * 2 * 100) / 100,
      };

  await stores$.penalties().set(penalty.id, updated);

  return json({
    penalty: updated,
    result: won ? "won" : "lost",
    originalAmount: original,
    newAmount: updated.amount,
  });
};

export const config = {
  path: "/api/penalties-gamble",
};
