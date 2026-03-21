"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";

export function useBusinessesQuery() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["businesses", token],
    enabled: !!token,
    queryFn: async () => {
      const data = await apiFetch<{ businesses: unknown[] }>("/api/business", { token });
      return data.businesses;
    },
  });
}

export function useCreateBusinessMutation() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async (body: { name: string; businessType: string }) => {
      return apiFetch<{ business: { id: string } }>("/api/business", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["businesses"] }),
  });
}

export function useItemsQuery(businessId: string | null, kind?: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["items", businessId, kind, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      if (kind) qs.set("kind", kind);
      const data = await apiFetch<{ items: unknown[] }>(`/api/items?${qs.toString()}`, { token });
      return data.items;
    },
  });
}

export function useReportSummary(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["report", "summary", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId!, type: "summary" });
      return apiFetch<{
        summary: { revenue: string; completedOrders: number; activeCustomers: number };
        lowStock: unknown[];
      }>(`/api/reports?${qs.toString()}`, { token });
    },
  });
}

export function useSalesByDay(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["report", "sales-by-day", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId!, type: "sales-by-day" });
      return apiFetch<{ series: { day: string; revenue: string; orders: number }[] }>(
        `/api/reports?${qs.toString()}`,
        { token }
      );
    },
  });
}

export function useCheckoutMutation() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      return apiFetch<{ order: unknown }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(body),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useCurrentBusinessId() {
  return useBusinessStore((s) => s.currentBusinessId);
}

export function useInventoryQuery(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["inventory", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ inventory: unknown[] }>(`/api/inventory?${qs.toString()}`, {
        token,
      });
      return data.inventory;
    },
  });
}
