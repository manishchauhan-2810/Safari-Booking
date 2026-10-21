import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();

  // The cached value is the admin object, or null when not logged in
  const { data: admin, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const data = await client.get("/admin/me");
        return data.admin;
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials) => client.post("/admin/login", credentials),
    onSuccess: (data) => queryClient.setQueryData(["me"], data.admin),
  });

  const logoutMutation = useMutation({
    mutationFn: () => client.post("/admin/logout"),
    onSettled: () => {
      queryClient.clear(); // drop every cached admin response
      queryClient.setQueryData(["me"], null);
    },
  });

  const value = useMemo(
    () => ({ admin: admin ?? null, isLoading, login: loginMutation.mutateAsync, logout: logoutMutation.mutateAsync }),
    [admin, isLoading, loginMutation.mutateAsync, logoutMutation.mutateAsync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};