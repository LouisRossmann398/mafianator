import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Bet } from "@shared/types";

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  points: number;
  betsEvaluated: number;
  betsTotal: number;
  exact: number;
  goalDiff: number;
  tendency: number;
  miss: number;
}

export function useMyBets() {
  return useQuery({
    queryKey: ["bets", "mine"],
    queryFn: () => apiFetch<{ bets: Bet[] }>("/bets?mine=1").then((d) => d.bets),
  });
}

export function useMatchBets(matchId: string | undefined) {
  return useQuery({
    queryKey: ["bets", "match", matchId],
    enabled: !!matchId,
    queryFn: () =>
      apiFetch<{ bets: Bet[] }>(`/bets?matchId=${encodeURIComponent(matchId!)}`).then(
        (d) => d.bets,
      ),
  });
}

export function useSubmitBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { matchId: string; homeGoals: number; awayGoals: number }) =>
      apiFetch<{ bet: Bet }>("/bets", { method: "POST", json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bets"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useSubmitBetsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bets: { matchId: string; homeGoals: number; awayGoals: number }[]) =>
      apiFetch<{ bets: Bet[]; errors?: string[] }>("/bets", {
        method: "POST",
        json: { bets },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bets"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useDeleteBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) =>
      apiFetch(`/bets?matchId=${encodeURIComponent(matchId)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bets"] }),
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch<{ rows: LeaderboardRow[] }>("/leaderboard").then((d) => d.rows),
  });
}
