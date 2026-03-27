import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL as BASE_URL } from "@/constants/api";

// Module-level auth token — set by AuthContext on login/logout/restore
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

// Global 401 handler — set by AuthContext so useApi can trigger logout
let _on401: (() => void) | null = null;

export function setOn401Handler(handler: () => void) {
  _on401 = handler;
}

export function getAuthToken(): string | null {
  return _authToken;
}

async function apiFetch(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (response.status === 401) {
    _on401?.();
    throw new Error("Session expired. Please sign in again.");
  }
  if (response.status === 204) return null;
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      message = (await response.text()) || message;
    }
    throw new Error(message);
  }
  return response.json();
}

export function useSummary(period?: "week" | "month") {
  return useQuery({
    queryKey: ["summary", period],
    queryFn: () => apiFetch(`/summary${period ? `?period=${period}` : ""}`),
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

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
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

export function useIncomeEntry(id: number | null) {
  return useQuery({
    queryKey: ["income-entry", id],
    queryFn: () => apiFetch(`/income/${id}`),
    enabled: id != null,
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/income/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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

export function useTrip(id: number | null) {
  return useQuery({
    queryKey: ["trip", id],
    queryFn: () => apiFetch(`/trips/${id}`),
    enabled: id != null,
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/trips/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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

// ── Cost Settings ─────────────────────────────────────────────────────────────

export function useCostSettings() {
  return useQuery({
    queryKey: ["cost-settings"],
    queryFn: () => apiFetch("/cost-settings"),
  });
}

export function useCostAnalysis() {
  return useQuery({
    queryKey: ["cost-analysis"],
    queryFn: () => apiFetch("/cost-settings/analysis"),
  });
}

export function useCreateCostSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; amount: number; frequency: string }) =>
      apiFetch("/cost-settings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-settings"] });
      qc.invalidateQueries({ queryKey: ["cost-analysis"] });
    },
  });
}

export function useUpdateCostSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ label: string; amount: number; frequency: string }> }) =>
      apiFetch(`/cost-settings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-settings"] });
      qc.invalidateQueries({ queryKey: ["cost-analysis"] });
    },
  });
}

export function useDeleteCostSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/cost-settings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-settings"] });
      qc.invalidateQueries({ queryKey: ["cost-analysis"] });
    },
  });
}

export function useLogCostToExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: number; date?: string }) =>
      apiFetch(`/cost-settings/${id}/log-expense`, { method: "POST", body: JSON.stringify({ date }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cost-analysis"] });
    },
  });
}

export function useLogAllCostsToExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) =>
      apiFetch("/cost-settings/log-all", { method: "POST", body: JSON.stringify({ date }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cost-analysis"] });
    },
  });
}

// ── Fleet ─────────────────────────────────────────────────────────────────────

export function useFleet() {
  return useQuery({
    queryKey: ["fleet"],
    queryFn: () => apiFetch("/fleet"),
  });
}

export function useFleetOverview() {
  const { data: fleet } = useFleet();
  return useQuery({
    queryKey: ["fleet-overview"],
    queryFn: () => apiFetch("/fleet/overview"),
    enabled: fleet?.role === "owner",
  });
}

export function useCreateFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch("/fleet", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useJoinFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiFetch("/fleet/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useLeaveFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/fleet/leave", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useDeleteFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/fleet", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useRemoveFleetMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => apiFetch(`/fleet/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fleet"] });
      qc.invalidateQueries({ queryKey: ["fleet-overview"] });
    },
  });
}

// Used for non-hook contexts (e.g. scan receipt screen)
export { apiFetch };
