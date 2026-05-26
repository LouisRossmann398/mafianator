import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  BalanceSummary,
  GoodDeed,
  Penalty,
  Player,
  Season,
} from "@shared/types";

interface BalancesResponse {
  balances: Record<string, BalanceSummary>;
  season: Season;
  players: Player[];
}

interface FeedItem {
  id: string;
  type: "penalty" | "good-deed" | "gamble";
  playerId: string;
  amount: number;
  reason: string;
  createdAt: string;
  meta?: {
    status?: Penalty["status"];
    originalAmount?: number;
    gambleResult?: "won" | "lost";
  };
}

export function usePenalties(playerId?: string) {
  return useQuery({
    queryKey: ["penalties", playerId ?? "all"],
    queryFn: () => {
      const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
      return apiFetch<{ penalties: Penalty[] }>(`/penalties${qs}`).then((d) => d.penalties);
    },
  });
}

export function useGoodDeeds(playerId?: string) {
  return useQuery({
    queryKey: ["good-deeds", playerId ?? "all"],
    queryFn: () => {
      const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
      return apiFetch<{ goodDeeds: GoodDeed[] }>(`/good-deeds${qs}`).then((d) => d.goodDeeds);
    },
  });
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: () => apiFetch<BalancesResponse>("/balances"),
  });
}

export function useFeed(opts: { playerId?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (opts.playerId) qs.set("playerId", opts.playerId);
  if (opts.limit) qs.set("limit", String(opts.limit));
  const search = qs.toString();
  return useQuery({
    queryKey: ["feed", opts.playerId ?? "all", opts.limit ?? "default"],
    queryFn: () =>
      apiFetch<{ items: FeedItem[] }>(`/feed${search ? `?${search}` : ""}`).then((d) => d.items),
  });
}

export function useCreatePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Penalty>) =>
      apiFetch<{ penalty: Penalty }>("/penalties", { method: "POST", json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penalties"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function usePatchPenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      amount,
      reason,
    }: {
      id: string;
      action: "mark-paid" | "reopen" | "edit";
      amount?: number;
      reason?: string;
    }) =>
      apiFetch<{ penalty: Penalty }>(`/penalties?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: { action, amount, reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penalties"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useDeletePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/penalties?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penalties"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useGamble() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{
        penalty: Penalty;
        result: "won" | "lost";
        originalAmount: number;
        newAmount: number;
      }>(`/penalties-gamble?id=${encodeURIComponent(id)}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penalties"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useCreateGoodDeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GoodDeed>) =>
      apiFetch<{ goodDeed: GoodDeed }>("/good-deeds", { method: "POST", json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["good-deeds"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export type { FeedItem };
