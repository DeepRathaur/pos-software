"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { useItemsQuery } from "@/hooks/queries";
import { isAnyModuleEnabled } from "@/lib/feature-modules";
import { Screen, StitchHeader, UnderlineTabs, ProductCard, SearchField } from "@/components/stitch";

export default function ProductsPage() {
  const token = useAuthStore((s) => s.token);
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canShowItems = current
    ? isAnyModuleEnabled(current.enabled_modules, [
        "products",
        "menu",
        "services",
        "recipes",
      ])
    : false;

  const { data: items, refetch } = useItemsQuery(businessId);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("99");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [kind, setKind] = useState<"product" | "service" | "menu_item">("product");
  const [err, setErr] = useState<string | null>(null);
  const [stockTab, setStockTab] = useState("all");
  const [search, setSearch] = useState("");

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
          barcode: barcode.trim() || null,
          imageUrl: imageUrl.trim() || null,
          durationMinutes: kind === "service" ? 30 : null,
          staffRequired: kind === "service",
        }),
      });
    },
    onSuccess: async () => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["items"] });
      refetch();
    },
  });

  const rows = useMemo(
    () => (items as { id: string; name: string; price: string; kind: string; is_active?: boolean }[]) ?? [],
    [items]
  );

  const filtered = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q));
    if (stockTab === "product") r = r.filter((x) => x.kind === "product");
    if (stockTab === "service") r = r.filter((x) => x.kind === "service");
    if (stockTab === "menu") r = r.filter((x) => x.kind === "menu_item");
    return r;
  }, [rows, search, stockTab]);

  return (
    <Screen>
      <StitchHeader title="Products" subtitle="Catalog & quick add" icon="inventory_2" />

      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canShowItems ? (
        <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-slate-400">
          Item catalog is disabled for this business profile.
        </div>
      ) : null}

      {businessId && canShowItems ? (
        <form
          className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            createItem.mutate(undefined, {
              onError: (er) => setErr(er instanceof Error ? er.message : "Failed"),
            });
          }}
        >
          <h2 className="text-sm font-semibold text-slate-200">Quick add</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-400 sm:col-span-2">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-slate-400">
              Price (₹)
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-slate-400 sm:col-span-2">
              Barcode (optional)
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type"
              />
            </label>
            <label className="text-sm text-slate-400 sm:col-span-3">
              Image URL (optional)
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="text-sm text-slate-400 sm:col-span-3">
              Kind
              <select
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
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
            className="mt-4 min-h-[48px] w-full rounded-2xl bg-stitch-primary text-base font-semibold text-white shadow-lg shadow-stitch-primary/25 disabled:opacity-40"
          >
            {createItem.isPending ? "Saving…" : "Save item"}
          </button>
        </form>
      ) : null}

      <UnderlineTabs
        tabs={[
          { id: "all", label: "All" },
          { id: "product", label: "Products" },
          { id: "service", label: "Services" },
          { id: "menu", label: "Menu" },
        ]}
        value={stockTab}
        onChange={setStockTab}
      />
      <SearchField value={search} onChange={setSearch} placeholder="Search catalog…" className="my-4" />

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((r) => (
          <ProductCard
            key={r.id}
            name={r.name}
            priceLabel={`₹${Number(r.price).toFixed(2)}`}
            kindHint={r.kind}
          />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No items.</p>
      ) : null}
    </Screen>
  );
}
