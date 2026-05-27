import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Match, TeamId } from "@shared/types";

export interface ScrapeStatusInfo {
  lastRun?: string;
  lastError?: string;
  matchesTotal?: number;
}

export function useMatches(team?: TeamId) {
  return useQuery({
    queryKey: ["matches", team ?? "all"],
    queryFn: () => {
      const qs = team ? `?team=${team}` : "";
      return apiFetch<{ matches: Match[]; scrapeStatus?: ScrapeStatusInfo }>(`/matches${qs}`);
    },
    select: (d) => ({
      matches: d.matches,
      scrapeStatus: d.scrapeStatus,
    }),
    retry: 1,
    staleTime: 60_000,
  });
}

export function useSvpMatches() {
  return useQuery({
    queryKey: ["matches", "svp"],
    queryFn: () =>
      apiFetch<{ matches: Match[] }>("/matches?svpOnly=1").then((d) => d.matches),
  });
}

export function useUpcomingMatches() {
  return useQuery({
    queryKey: ["matches", "upcoming", "svp"],
    queryFn: () =>
      apiFetch<{ matches: Match[] }>(`/matches?upcoming=1&svpOnly=1`).then((d) => d.matches),
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
    mutationFn: () =>
      apiFetch<{ status: { matchesTotal: number; matchesCreated: number; matchesUpdated: number } }>(
        "/scrape-trigger",
        { method: "POST" },
      ).then((d) => d.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["scrape-status"] });
    },
  });
}
