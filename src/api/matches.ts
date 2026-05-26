import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Match, TeamId } from "@shared/types";

export function useMatches(team?: TeamId) {
  return useQuery({
    queryKey: ["matches", team ?? "all"],
    queryFn: () => {
      const qs = team ? `?team=${team}` : "";
      return apiFetch<{ matches: Match[] }>(`/matches${qs}`).then((d) => d.matches);
    },
  });
}

export function useUpcomingMatches() {
  return useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: () =>
      apiFetch<{ matches: Match[] }>(`/matches?upcoming=1`).then((d) => d.matches),
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Match>) =>
      apiFetch<{ match: Match }>("/matches", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Match> }) =>
      apiFetch<{ match: Match }>(`/matches?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        json: data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/matches?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useTriggerScrape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ updated: number; total: number }>("/scrape-trigger", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}
