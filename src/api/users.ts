import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { UserPublic, Role } from "@shared/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ users: UserPublic[] }>("/users").then((d) => d.users),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      username: string;
      password: string;
      role: Role;
      displayName: string;
      playerId?: string;
    }) => apiFetch<{ user: UserPublic }>("/users", { method: "POST", json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      username,
      data,
    }: {
      username: string;
      data: { displayName?: string; role?: Role; playerId?: string; password?: string };
    }) =>
      apiFetch<{ user: UserPublic }>(`/users?username=${encodeURIComponent(username)}`, {
        method: "PUT",
        json: data,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch(`/users?username=${encodeURIComponent(username)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
