import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Summary
export function useSummary() {
  return useQuery({ queryKey: ["summary"], queryFn: () => apiFetch("/summary") });
}

// Expenses
export function useExpenses() {
  return useQuery({ queryKey: ["expenses"], queryFn: () => apiFetch("/expenses") });
}
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}

// Income
export function useIncome() {
  return useQuery({ queryKey: ["income"], queryFn: () => apiFetch("/income") });
}
export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/income", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["income"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}
export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/income/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["income"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}

// Fuel
export function useFuelEntries() {
  return useQuery({ queryKey: ["fuel-entries"], queryFn: () => apiFetch("/fuel-entries") });
}
export function useCreateFuelEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/fuel-entries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fuel-entries"] }),
  });
}
export function useDeleteFuelEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/fuel-entries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fuel-entries"] }),
  });
}

// Trips
export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => apiFetch("/trips") });
}
export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/trips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trips"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}
export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trips"] }); qc.invalidateQueries({ queryKey: ["summary"] }); },
  });
}

// Assets
export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: () => apiFetch("/assets") });
}
export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/assets", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}
export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

// Saved Routes
export function useSavedRoutes() {
  return useQuery({ queryKey: ["saved-routes"], queryFn: () => apiFetch("/saved-routes") });
}
export function useCreateSavedRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/saved-routes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-routes"] }),
  });
}
export function useDeleteSavedRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/saved-routes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-routes"] }),
  });
}

// Quick Expenses
export function useQuickExpenses() {
  return useQuery({ queryKey: ["quick-expenses"], queryFn: () => apiFetch("/quick-expenses") });
}
export function useCreateQuickExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch("/quick-expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick-expenses"] }),
  });
}
export function useDeleteQuickExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/quick-expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick-expenses"] }),
  });
}

export function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtCurrency(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
