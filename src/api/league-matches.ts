import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { LeagueKey, LeagueMatch } from "@shared/types";

export interface LeagueMatchesResponse {
  matches: LeagueMatch[];
  seasonId: string;
  scrapeStatus?: {
    lastRun?: string;
    lastError?: string;
    matchesTotal?: number;
    kreisklasse?: number;
    cKlasse?: number;
    withResults?: number;
  };
}

export function useLeagueMatches(leagueKey?: LeagueKey) {
  return useQuery({
    queryKey: ["league-matches", leagueKey ?? "all"],
    queryFn: () => {
      const qs = leagueKey ? `?leagueKey=${leagueKey}` : "";
      return apiFetch<LeagueMatchesResponse>(`/league-matches${qs}`);
    },
    staleTime: 5 * 60_000,
  });
}

export function useBfvSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{
        ok: boolean;
        matchesTotal: number;
        withResults: number;
        kreisklasse: number;
        cKlasse: number;
      }>("/bfv-sync", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["league-matches"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["bets"] });
    },
  });
}
