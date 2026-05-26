import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Birthday } from "@shared/types";

export function useBirthdays() {
  return useQuery({
    queryKey: ["birthdays"],
    queryFn: () =>
      apiFetch<{ birthdays: Birthday[] }>("/birthdays").then((d) => d.birthdays),
  });
}

export function useUpsertBirthday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Birthday) =>
      apiFetch<{ birthday: Birthday }>("/birthdays", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["birthdays"] }),
  });
}

export function useDeleteBirthday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      apiFetch(`/birthdays?playerId=${encodeURIComponent(playerId)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["birthdays"] }),
  });
}
