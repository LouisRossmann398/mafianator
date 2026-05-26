import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Season } from "@shared/types";

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: () =>
      apiFetch<{ seasons: Season[]; current: Season }>("/seasons").then((d) => ({
        seasons: d.seasons,
        current: d.current,
      })),
  });
}

export function useStartNewSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id?: string; name: string; startBalance: number }) =>
      apiFetch<{ season: Season; archived: number }>("/seasons", {
        method: "POST",
        json: { action: "start-new", ...data },
      }),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
