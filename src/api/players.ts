import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Player } from "@shared/types";

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: () => apiFetch<{ players: Player[] }>("/players").then((d) => d.players),
  });
}

export function useCreatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Player>) =>
      apiFetch<{ player: Player }>("/players", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) =>
      apiFetch<{ player: Player }>(`/players?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        json: data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/players?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}
