"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { useItemsQuery } from "@/hooks/queries";
import { hasModule } from "@/lib/modules-client";

export default function ProductsPage() {
  const token = useAuthStore((s) => s.token);
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canShowItems = current
    ? hasModule(current.enabled_modules, "products") ||
      hasModule(current.enabled_modules, "services") ||
      hasModule(current.enabled_modules, "menu")
    : false;

  const { data: items, refetch } = useItemsQuery(businessId);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("99");
  const [kind, setKind] = useState<"product" | "service" | "menu_item">("product");
  const [err, setErr] = useState<string | null>(null);

  const createItem = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business");
      return apiFetch<{ item: unknown }>("/api/items", {
        method: "POST",
        token,
        body: JSON.stringify({
          businessId,
          name,
          price: Number(price),
          kind,
          trackInventory: kind === "product",
        }),
      });
    },
    onSuccess: async () => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["items"] });
      refetch();
    },
  });

  const rows = useMemo(() => (items as { id: string; name: string; price: string; kind: string }[]) ?? [], [items]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Items</h1>
        <p className="text-sm text-zinc-500">Products, services, and menu items share one model.</p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canShowItems ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          Item catalog is disabled for this business profile.
        </div>
      ) : null}

      {businessId && canShowItems ? (
        <form
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            createItem.mutate(undefined, {
              onError: (er) => setErr(er instanceof Error ? er.message : "Failed"),
            });
          }}
        >
          <h2 className="text-sm font-semibold text-zinc-200">Quick add</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-zinc-400 sm:col-span-2">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-zinc-400">
              Price (₹)
              <input
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-zinc-400 sm:col-span-3">
              Kind
              <select
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="menu_item">Menu item</option>
              </select>
            </label>
          </div>
          {err ? <p className="mt-2 text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            disabled={createItem.isPending}
            className="mt-4 min-h-[48px] w-full rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 disabled:opacity-40"
          >
            {createItem.isPending ? "Saving…" : "Save item"}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">
          Catalog ({rows.length})
        </div>
        <ul className="divide-y divide-zinc-800">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium text-zinc-100">{r.name}</span>
              <span className="text-xs uppercase text-zinc-500">{r.kind}</span>
              <span className="tabular-nums text-emerald-300">₹{Number(r.price).toFixed(2)}</span>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">No items yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
