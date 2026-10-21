import { useQuery } from "@tanstack/react-query";
import client from "./client";

export const useZones = () =>
  useQuery({ queryKey: ["zones"], queryFn: () => client.get("/public/zones"), staleTime: 5 * 60_000 });

export const useSummary = (month, vehicleType, zone) =>
  useQuery({
    queryKey: ["summary", month, vehicleType, zone || ""],
    queryFn: () => client.get("/admin/availability/summary", { params: { month, vehicleType, zone: zone || undefined } }),
  });

export const useDaySlots = (date, vehicleType, zone) =>
  useQuery({
    queryKey: ["day", date, vehicleType, zone || ""],
    queryFn: () => client.get("/admin/availability", { params: { from: date, to: date, vehicleType, zone: zone || undefined } }),
    enabled: Boolean(date),
  });

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: () => client.get("/admin/settings") });