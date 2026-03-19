import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

const BASE_URL = Platform.OS === "web"
  ? "/api"
  : `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `HTTP ${response.status}`);
  }
  return response.json();
}

export function useSummary() {
  return useQuery({
    queryKey: ["summary"],
    queryFn: () => apiFetch("/summary"),
  });
}

export function useExpenses(params?: { category?: string; week?: boolean; search?: string }) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.week) query.set("week", "true");
  if (params?.search) query.set("search", params.search);
  const qs = query.toString() ? `?${query.toString()}` : "";

  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => apiFetch(`/expenses${qs}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useExpense(id: number | null) {
  return useQuery({
    queryKey: ["expense", id],
    queryFn: () => apiFetch(`/expenses/${id}`),
    enabled: id != null,
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useIncome(params?: { week?: boolean }) {
  const qs = params?.week ? "?week=true" : "";
  return useQuery({
    queryKey: ["income", params],
    queryFn: () => apiFetch(`/income${qs}`),
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/income", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/income/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useFuelEntries() {
  return useQuery({
    queryKey: ["fuel-entries"],
    queryFn: () => apiFetch("/fuel-entries"),
  });
}

export function useCreateFuelEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/fuel-entries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-entries"] });
    },
  });
}

export function useDeleteFuelEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/fuel-entries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel-entries"] });
    },
  });
}

export function useTrips() {
  return useQuery({
    queryKey: ["trips"],
    queryFn: () => apiFetch("/trips"),
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/trips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: () => apiFetch("/assets"),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/assets", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useSavedRoutes() {
  return useQuery({
    queryKey: ["saved-routes"],
    queryFn: () => apiFetch("/saved-routes"),
  });
}

export function useCreateSavedRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/saved-routes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-routes"] });
    },
  });
}

export function useDeleteSavedRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/saved-routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-routes"] });
    },
  });
}

export function useQuickExpenses() {
  return useQuery({
    queryKey: ["quick-expenses"],
    queryFn: () => apiFetch("/quick-expenses"),
  });
}

export function useCreateQuickExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/quick-expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-expenses"] });
    },
  });
}

export function useDeleteQuickExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/quick-expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-expenses"] });
    },
  });
}

export function useIFTA(quarter: number, year: number) {
  return useQuery({
    queryKey: ["ifta", quarter, year],
    queryFn: () => apiFetch(`/ifta?quarter=${quarter}&year=${year}`),
  });
}
