import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { AchievementsRecord } from "@shared/types";

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: () =>
      apiFetch<{ record: AchievementsRecord }>("/achievements").then((d) => d.record),
  });
}
