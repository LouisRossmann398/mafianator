import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { CatalogEntry } from "@shared/types";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiFetch<{ entries: CatalogEntry[] }>("/catalog").then((d) => d.entries),
  });
}

export function useCreateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CatalogEntry>) =>
      apiFetch<{ entry: CatalogEntry }>("/catalog", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useUpdateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogEntry> }) =>
      apiFetch<{ entry: CatalogEntry }>(`/catalog?id=${encodeURIComponent(id)}`, {
        method: "PUT",
        json: data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useDeleteCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/catalog?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}
