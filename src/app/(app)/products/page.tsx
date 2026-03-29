"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { useCategoriesQuery, useItemsQuery } from "@/hooks/queries";
import { isAnyModuleEnabled } from "@/lib/feature-modules";
import {
  Screen,
  StitchHeader,
  UnderlineTabs,
  PillTabs,
  ProductCard,
  SearchField,
  StitchModal,
  StitchButton,
} from "@/components/stitch";

type ItemRow = {
  id: string;
  name: string;
  price: string;
  kind: string;
  category_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

function ProductsContent() {
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
  const categoriesQ = useCategoriesQuery(businessId);
  const qc = useQueryClient();

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("99");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [stockTab, setStockTab] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryTabId, setCategoryTabId] = useState("all");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "menu") setStockTab("menu");
  }, [searchParams]);

  useEffect(() => {
    setCategoryTabId("all");
  }, [stockTab]);

  const createMenuItem = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business");
      return apiFetch<{ item: unknown }>("/api/items", {
        method: "POST",
        token,
        body: JSON.stringify({
          businessId,
          name,
          price: Number(price),
          kind: "menu_item",
          trackInventory: false,
          barcode: barcode.trim() || null,
          imageUrl: imageUrl.trim() || null,
        }),
      });
    },
    onSuccess: async () => {
      setName("");
      setPrice("99");
      setBarcode("");
      setImageUrl("");
      setAddMenuOpen(false);
      setErr(null);
      await qc.invalidateQueries({ queryKey: ["items"] });
      refetch();
    },
  });

  const rows = useMemo(() => (items as ItemRow[]) ?? [], [items]);

  const filtered = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q));
    if (stockTab === "product") r = r.filter((x) => x.kind === "product");
    if (stockTab === "service") r = r.filter((x) => x.kind === "service");
    if (stockTab === "menu") r = r.filter((x) => x.kind === "menu_item");
    return r;
  }, [rows, search, stockTab]);

  const categorySections = useMemo(() => {
    if (categoriesQ.data === undefined) return null;

    const m = new Map<string | null, ItemRow[]>();
    for (const item of filtered) {
      const cid = item.category_id != null ? item.category_id : null;
      const arr = m.get(cid) ?? [];
      arr.push(item);
      m.set(cid, arr);
    }

    const categories = categoriesQ.data;
    const catIds = new Set(categories.map((c) => c.id));
    const sections: { key: string; title: string; items: ItemRow[] }[] = [];

    for (const c of categories) {
      const list = m.get(c.id);
      if (list?.length) sections.push({ key: c.id, title: c.name, items: list });
    }

    const unc = m.get(null);
    if (unc?.length) sections.push({ key: "uncategorized", title: "Uncategorized", items: unc });

    let other: ItemRow[] = [];
    for (const [k, v] of m) {
      if (k !== null && !catIds.has(k) && v.length) other = other.concat(v);
    }
    if (other.length) sections.push({ key: "other", title: "Other", items: other });

    return sections;
  }, [filtered, categoriesQ.data]);

  const categoryPillTabs = useMemo(() => {
    if (!categorySections?.length) return [];
    const tabs = [{ id: "all", label: "All categories" }];
    for (const s of categorySections) {
      tabs.push({ id: s.key, label: s.title });
    }
    return tabs;
  }, [categorySections]);

  const sortedAllInCategoryOrder = useMemo(() => {
    if (!categorySections?.length) return filtered;
    return categorySections.flatMap((s) =>
      [...s.items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    );
  }, [categorySections, filtered]);

  const visibleItems = useMemo(() => {
    if (categorySections === null) return filtered;
    if (categoryTabId === "all") return sortedAllInCategoryOrder;
    const sec = categorySections.find((s) => s.key === categoryTabId);
    return sec?.items ?? [];
  }, [categorySections, categoryTabId, filtered, sortedAllInCategoryOrder]);

  useEffect(() => {
    if (categorySections === null) return;
    if (categoryTabId === "all") return;
    const valid = categorySections.some((s) => s.key === categoryTabId && s.items.length > 0);
    if (!valid) setCategoryTabId("all");
  }, [categorySections, categoryTabId]);

  function renderProductGrid(items: ItemRow[]) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((r) => (
          <Link
            key={r.id}
            href={`/products/${r.id}`}
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-stitch-primary"
          >
            <ProductCard
              name={r.name}
              priceLabel={`₹${Number(r.price).toFixed(2)}`}
              kindHint={r.kind}
              imageUrl={r.image_url ?? undefined}
            />
          </Link>
        ))}
      </div>
    );
  }

  function submitMenuItem(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    createMenuItem.mutate(undefined, {
      onError: (er) => setErr(er instanceof Error ? er.message : "Failed"),
    });
  }

  return (
    <Screen>
      <StitchHeader
        title="Products"
        subtitle={
          stockTab === "menu"
            ? "Menu editor — tap an item to view or edit details"
            : "Catalog — tap an item to edit"
        }
        icon="inventory_2"
      />

      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canShowItems ? (
        <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-stitch-fg-muted">
          Item catalog is disabled for this business profile.
        </div>
      ) : null}

      {businessId && canShowItems ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/pos"
            className="inline-flex items-center rounded-full border border-stitch-border bg-stitch-card px-3 py-1.5 text-sm font-semibold text-stitch-fg-secondary transition hover:border-stitch-primary/50 hover:text-stitch-primary"
          >
            Add order
          </Link>
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setAddMenuOpen(true);
            }}
            className="inline-flex items-center rounded-full border border-stitch-primary/40 bg-stitch-primary/15 px-3 py-1.5 text-sm font-semibold text-stitch-primary transition hover:bg-stitch-primary/25"
          >
            Add menu item
          </button>
        </div>
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

      {businessId && canShowItems ? (
        <>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-stitch-fg-muted">No items.</p>
          ) : categorySections === null ? (
            renderProductGrid(filtered)
          ) : (
            <>
              {categoryPillTabs.length > 1 ? (
                <PillTabs
                  tabs={categoryPillTabs}
                  value={categoryTabId}
                  onChange={setCategoryTabId}
                  className="mb-4"
                />
              ) : null}
              {visibleItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-stitch-fg-muted">No items in this category.</p>
              ) : (
                renderProductGrid(visibleItems)
              )}
            </>
          )}
        </>
      ) : null}

      <StitchModal open={addMenuOpen} title="Add menu item" onClose={() => setAddMenuOpen(false)}>
        <form onSubmit={submitMenuItem} className="space-y-3">
          <label className="block text-sm text-stitch-fg-muted">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Price (₹)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Barcode (optional)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or type"
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Image URL (optional)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
            <StitchButton type="submit" className="min-h-[48px] flex-1" disabled={createMenuItem.isPending}>
              {createMenuItem.isPending ? "Saving…" : "Save menu item"}
            </StitchButton>
            <StitchButton
              type="button"
              variant="secondary"
              className="min-h-[48px] flex-1"
              onClick={() => setAddMenuOpen(false)}
            >
              Cancel
            </StitchButton>
          </div>
        </form>
      </StitchModal>
    </Screen>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Screen>
          <StitchHeader title="Products" subtitle="Loading…" icon="inventory_2" />
          <p className="text-sm text-stitch-fg-muted">Loading catalog…</p>
        </Screen>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
