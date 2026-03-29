"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import type { CartLine } from "@/stores/cart-store";
import { useCartStore } from "@/stores/cart-store";

type CartSnapshot = { lines: CartLine[]; discountAmount: number };

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

export function usePatchBusinessMutation() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({
      businessId,
      body,
    }: {
      businessId: string;
      body: {
        name?: string;
        businessType?: string;
        settings?: Record<string, unknown>;
        enabledModules?: string[];
      };
    }) => {
      return apiFetch<{ business: unknown }>(`/api/business/${businessId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["businesses"] }),
  });
}

export function useCategoriesQuery(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["categories", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ categories: { id: string; name: string; sort_order: number }[] }>(
        `/api/categories?${qs.toString()}`,
        { token }
      );
      return data.categories;
    },
  });
}

export function useItemsQuery(
  businessId: string | null,
  kind?: string,
  search?: string,
  barcode?: string | null
) {
  const token = useAuthStore((s) => s.token);
  const q = search?.trim() ?? "";
  const bc = barcode?.trim() ?? "";
  return useQuery({
    queryKey: ["items", businessId, kind, q, bc, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      if (kind) qs.set("kind", kind);
      if (bc.length > 0) qs.set("barcode", bc);
      else if (q.length > 0) qs.set("search", q);
      const data = await apiFetch<{ items: unknown[] }>(`/api/items?${qs.toString()}`, { token });
      return data.items;
    },
  });
}

/** Single item row as returned by GET /api/items/[id] (Postgres snake_case columns). */
export type ItemDetailRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  kind: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  description: string | null;
  price: string | number;
  cost: string | number | null;
  tax_rate: string | number;
  track_inventory: boolean;
  duration_minutes: number | null;
  staff_required: boolean;
  metadata: unknown;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export function useItemQuery(businessId: string | null, itemId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["items", "detail", businessId, itemId, token],
    enabled: !!token && !!businessId && !!itemId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ item: ItemDetailRow }>(`/api/items/${itemId}?${qs.toString()}`, {
        token,
      });
      return data.item;
    },
  });
}

export function usePatchItemMutation() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  return useMutation({
    mutationFn: async ({
      itemId,
      businessId,
      body,
    }: {
      itemId: string;
      businessId: string;
      body: Record<string, unknown>;
    }) => {
      return apiFetch<{ item: ItemDetailRow }>(`/api/items/${itemId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ businessId, ...body }),
      });
    },
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["items", "detail", v.businessId, v.itemId] });
    },
  });
}

export type DashboardResponse = {
  sales_today: number;
  orders_today: number;
  profit: number;
  purchases: number;
  top_products: {
    item_id: string;
    name: string;
    units_sold: string;
    revenue: string;
  }[];
  low_stock: {
    item_id: string;
    name: string;
    quantity: string;
    reorder_level: string;
  }[];
  sales_last_7_days: { day: string; sales: string; orders: number }[];
};

export function useDashboardQuery(businessId: string | null, reportModuleEnabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["dashboard", businessId, token],
    enabled: !!token && !!businessId && reportModuleEnabled,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      return apiFetch<DashboardResponse>(`/api/dashboard?${qs.toString()}`, { token });
    },
  });
}

export function useReportSummary(businessId: string | null, reportModuleEnabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["report", "summary", businessId, token],
    enabled: !!token && !!businessId && reportModuleEnabled,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId!, type: "summary" });
      return apiFetch<{
        summary: { revenue: string; completedOrders: number; activeCustomers: number };
        lowStock: unknown[];
      }>(`/api/reports?${qs.toString()}`, { token });
    },
  });
}

export function useSalesByDay(businessId: string | null, reportModuleEnabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["report", "sales-by-day", businessId, token],
    enabled: !!token && !!businessId && reportModuleEnabled,
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
    onMutate: async (): Promise<{ snap: CartSnapshot }> => {
      const state = useCartStore.getState();
      const snap: CartSnapshot = {
        lines: state.lines.map((l) => ({ ...l })),
        discountAmount: state.discountAmount,
      };
      state.clear();
      return { snap };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snap) {
        useCartStore.setState({
          lines: ctx.snap.lines,
          discountAmount: ctx.snap.discountAmount,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["kot"] });
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

export type RestaurantTableRow = {
  id: string;
  label: string;
  status: string;
  capacity: number;
  current_order_id: string | null;
  current_order_number?: string | null;
  order_status?: string | null;
  order_total?: string | null;
};

export function useTablesQuery(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["tables", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ tables: RestaurantTableRow[] }>(
        `/api/tables?${qs.toString()}`,
        { token }
      );
      return data.tables;
    },
  });
}

export type KotTicketRow = {
  id: string;
  order_id: string;
  status: string;
  order_number?: string | null;
  table_label?: string | null;
  items: { quantity: string | number; name: string; line_kitchen_status?: string | null }[];
};

export function useKotQuery(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["kot", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ tickets: KotTicketRow[] }>(`/api/kot?${qs.toString()}`, {
        token,
      });
      return data.tickets;
    },
  });
}

export type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customer_name?: string | null;
  staff_name?: string | null;
  service_name?: string | null;
  notes?: string | null;
  order_id?: string | null;
};

export function useAppointmentsQuery(
  businessId: string | null,
  fromIso: string | null,
  toIso: string | null
) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["appointments", businessId, fromIso, toIso, token],
    enabled: !!token && !!businessId && !!fromIso && !!toIso,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      qs.set("from", fromIso!);
      qs.set("to", toIso!);
      const data = await apiFetch<{ appointments: AppointmentRow[] }>(
        `/api/appointments?${qs.toString()}`,
        { token }
      );
      return data.appointments;
    },
  });
}

export type AdvancedReportsResponse = {
  sales: {
    today: { revenue: string; orders: number };
    week: { revenue: string; orders: number };
    month: { revenue: string; orders: number };
  };
  top_products: { item_id: string; name: string; units: string; revenue: string }[];
  low_stock: { item_id: string; name: string; quantity: string; reorder_level: string }[];
  staff: {
    id: string;
    name: string;
    revenue: string;
    services: number;
    commission_rate: string;
    commission_estimate: number;
  }[];
  top_customers: { id: string; name: string; spend: string; order_count: number }[];
  repeat_customers: { id: string; name: string; order_count: number }[];
  purchase_outstanding: {
    id: string;
    total: string;
    amount_paid: string;
    balance_due: string;
    supplier_name: string | null;
    created_at: string;
  }[];
};

export function useAdvancedReportsQuery(businessId: string | null, reportModuleEnabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["reports", "advanced", businessId, token],
    enabled: !!token && !!businessId && reportModuleEnabled,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      return apiFetch<AdvancedReportsResponse>(`/api/reports/advanced?${qs.toString()}`, {
        token,
      });
    },
  });
}

export function useStaffQuery(businessId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["staff", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ staff: { id: string; name: string; role?: string }[] }>(
        `/api/staff?${qs.toString()}`,
        { token }
      );
      return data.staff;
    },
  });
}

export function useCustomersQuery(businessId: string | null, queryEnabled = true) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["customers", businessId, token],
    enabled: !!token && !!businessId && queryEnabled,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ customers: { id: string; name: string; phone?: string | null }[] }>(
        `/api/customers?${qs.toString()}`,
        { token }
      );
      return data.customers;
    },
  });
}

type TableCheckoutLine = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
};

type TableCheckoutInput = {
  businessId: string;
  tableId: string;
  customerId?: string | null;
  lines: TableCheckoutLine[];
  discountAmount: number;
  payment:
    | { method: "cash" | "upi" | "card" | "other"; amount: number; reference?: string | null }
    | undefined;
  payments:
    | { method: "cash" | "upi" | "card" | "other"; amount: number; reference?: string | null }[]
    | undefined;
  attributedStaffId?: string | null;
};

export function useTableCheckoutMutation() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TableCheckoutInput) => {
      const openLines = body.lines.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineDiscount: l.lineDiscount && l.lineDiscount > 0 ? l.lineDiscount : undefined,
      }));
      const opened = await apiFetch<{ order: { id: string } }>("/api/orders/open", {
        method: "POST",
        body: JSON.stringify({
          businessId: body.businessId,
          tableId: body.tableId,
          customerId: body.customerId ?? null,
          lines: openLines,
        }),
        token,
      });
      const completePayload: Record<string, unknown> = {
        businessId: body.businessId,
        discountAmount: body.discountAmount,
        attributedStaffId: body.attributedStaffId ?? null,
      };
      if (body.payments && body.payments.length > 0) {
        completePayload.payments = body.payments;
      } else if (body.payment) {
        completePayload.payment = body.payment;
      }
      return apiFetch<{ order: unknown }>(`/api/orders/${opened.order.id}/complete`, {
        method: "POST",
        body: JSON.stringify(completePayload),
        token,
      });
    },
    onSuccess: () => {
      useCartStore.getState().clear();
      qc.invalidateQueries({ queryKey: ["report"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["kot"] });
      qc.invalidateQueries({ queryKey: ["reports", "advanced"] });
    },
  });
}
