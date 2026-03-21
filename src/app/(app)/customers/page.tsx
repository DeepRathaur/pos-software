"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";

export default function CustomersPage() {
  const token = useAuthStore((s) => s.token);
  const businessId = useBusinessStore((s) => s.currentBusinessId);

  const q = useQuery({
    queryKey: ["customers", businessId, token],
    enabled: !!token && !!businessId,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ customers: { id: string; name: string; phone: string | null }[] }>(
        `/api/customers?${qs.toString()}`,
        { token }
      );
      return data.customers;
    },
  });

  const rows = q.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Customers</h1>
        <p className="text-sm text-zinc-500">Loyalty-ready customer records.</p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">
            Directory ({rows.length})
          </div>
          {q.isLoading ? (
            <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {rows.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-zinc-100">{c.name}</p>
                  {c.phone ? <p className="text-xs text-zinc-500">{c.phone}</p> : null}
                </li>
              ))}
              {rows.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-zinc-500">No customers yet.</li>
              ) : null}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
