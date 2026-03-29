"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useCategoriesQuery,
  useItemQuery,
  usePatchItemMutation,
} from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";
import { isAnyModuleEnabled } from "@/lib/feature-modules";
import { Screen, StitchButton, StitchHeader } from "@/components/stitch";

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ProductDetailPage() {
  const params = useParams();
  const itemId = typeof params.id === "string" ? params.id : null;

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

  const itemQ = useItemQuery(businessId, itemId);
  const categoriesQ = useCategoriesQuery(businessId);
  const patch = usePatchItemMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [cost, setCost] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [kind, setKind] = useState<"product" | "service" | "menu_item" | "recipe_component">(
    "product"
  );
  const [trackInventory, setTrackInventory] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [staffRequired, setStaffRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const it = itemQ.data;

  useEffect(() => {
    if (!it) return;
    setName(it.name ?? "");
    setDescription(it.description ?? "");
    setPrice(String(num(it.price)));
    setTaxRate(String(num(it.tax_rate)));
    setCost(it.cost != null ? String(num(it.cost)) : "");
    setSku(it.sku ?? "");
    setBarcode(it.barcode ?? "");
    setImageUrl(it.image_url ?? "");
    setCategoryId(it.category_id ?? "");
    setKind(
      (it.kind === "product" ||
        it.kind === "service" ||
        it.kind === "menu_item" ||
        it.kind === "recipe_component"
        ? it.kind
        : "product") as typeof kind
    );
    setTrackInventory(Boolean(it.track_inventory));
    setDurationMinutes(
      it.duration_minutes != null && it.duration_minutes !== undefined
        ? String(it.duration_minutes)
        : ""
    );
    setStaffRequired(Boolean(it.staff_required));
    setIsActive(Boolean(it.is_active));
  }, [it]);

  const backHref = useMemo(() => {
    if (kind === "menu_item") return "/products?tab=menu";
    return "/products";
  }, [kind]);

  function handleSave() {
    if (!businessId || !itemId) return;
    setMsg(null);
    const priceN = Number(price);
    if (!name.trim() || !Number.isFinite(priceN) || priceN < 0) {
      setMsg("Name and a valid price are required.");
      return;
    }
    const taxN = Number(taxRate);
    const costN = cost.trim() === "" ? null : Number(cost);
    if (costN != null && (!Number.isFinite(costN) || costN < 0)) {
      setMsg("Cost must be a valid number.");
      return;
    }

    patch.mutate(
      {
        itemId,
        businessId,
        body: {
          name: name.trim(),
          description: description.trim() || null,
          price: priceN,
          taxRate: Number.isFinite(taxN) && taxN >= 0 ? taxN : 0,
          cost: costN,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          imageUrl: imageUrl.trim() || null,
          categoryId: categoryId || null,
          kind,
          trackInventory: kind === "product" ? trackInventory : false,
          durationMinutes:
            kind === "service"
              ? Math.max(0, Math.floor(Number(durationMinutes) || 0))
              : null,
          staffRequired: kind === "service" ? staffRequired : false,
          isActive,
        },
      },
      {
        onSuccess: () => {
          setMsg(null);
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 2500);
        },
        onError: (e) => setMsg(e instanceof Error ? e.message : "Save failed"),
      }
    );
  }

  if (!businessId || !canShowItems) {
    return (
      <Screen>
        <StitchHeader title="Item" icon="inventory_2" />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business with catalog access in <strong>Setup</strong>, or open from{" "}
          <Link href="/products" className="font-semibold text-stitch-primary underline">
            Items
          </Link>
          .
        </div>
      </Screen>
    );
  }

  if (itemQ.isLoading) {
    return (
      <Screen>
        <StitchHeader title="Item" icon="inventory_2" />
        <p className="text-sm text-stitch-fg-muted">Loading…</p>
      </Screen>
    );
  }

  if (itemQ.isError || !it) {
    return (
      <Screen>
        <StitchHeader title="Item" icon="inventory_2" />
        <p className="text-sm text-rose-400">Item not found or you do not have access.</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-semibold text-stitch-primary underline"
        >
          Back to catalog
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <StitchHeader
        title="Edit item"
        subtitle={kind === "menu_item" ? "Menu — update photo, price, and details" : "Catalog item"}
        icon="inventory_2"
        right={
          <Link
            href={backHref}
            className="text-sm font-semibold text-stitch-primary underline"
          >
            Back
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <label className="block text-xs text-stitch-fg-muted">Image preview</label>
        <div
          className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-xl border border-stitch-border bg-gradient-to-br from-stitch-surface to-stitch-bg bg-cover bg-center"
          style={
            imageUrl.trim()
              ? { backgroundImage: `url(${imageUrl.trim()})` }
              : undefined
          }
        />
        <label className="mt-3 block text-sm text-stitch-fg-muted">
          Image URL
          <input
            className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (food or product photo)"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-stitch-border bg-stitch-card p-4">
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
          Description
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-stitch-fg-muted">
            Price (₹)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Tax (%)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm text-stitch-fg-muted">
          Cost (₹, optional)
          <input
            className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="—"
          />
        </label>
        <label className="block text-sm text-stitch-fg-muted">
          Category
          <select
            className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— None —</option>
            {(categoriesQ.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-stitch-fg-muted">
          Kind
          <select
            className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as typeof kind)
            }
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
            <option value="menu_item">Menu item</option>
            <option value="recipe_component">Recipe component</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-stitch-fg-muted">
            SKU (optional)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Barcode (optional)
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </label>
        </div>
        {kind === "product" ? (
          <label className="flex items-center gap-2 text-sm text-stitch-fg">
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="h-4 w-4 rounded border-stitch-border"
            />
            Track inventory
          </label>
        ) : null}
        {kind === "service" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-stitch-fg-muted">
              Duration (minutes)
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm text-stitch-fg">
              <input
                type="checkbox"
                checked={staffRequired}
                onChange={(e) => setStaffRequired(e.target.checked)}
                className="h-4 w-4 rounded border-stitch-border"
              />
              Staff required
            </label>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-stitch-fg">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-stitch-border"
          />
          Active (visible in POS)
        </label>
      </div>

      {msg ? <p className="mt-3 text-sm text-rose-400">{msg}</p> : null}
      {savedFlash ? <p className="mt-3 text-sm text-emerald-400">Saved.</p> : null}

      <StitchButton
        className="mt-6 min-h-[48px] w-full"
        onClick={handleSave}
        disabled={patch.isPending}
      >
        {patch.isPending ? "Saving…" : "Save changes"}
      </StitchButton>
    </Screen>
  );
}
