import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./client";
import type { UserPublic } from "@shared/types";

interface AuthContextValue {
  user: UserPublic | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await apiFetch<{ user: UserPublic }>("/auth-me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return { user: null };
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const login = React.useCallback(
    async (username: string, password: string) => {
      await apiFetch<{ user: UserPublic }>("/auth-login", {
        method: "POST",
        json: { username, password },
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    [queryClient],
  );

  const logout = React.useCallback(async () => {
    await apiFetch("/auth-logout", { method: "POST" });
    queryClient.clear();
    await refetch();
  }, [queryClient, refetch]);

  const refresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        loading: isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
