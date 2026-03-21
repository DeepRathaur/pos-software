"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Icon,
  PillTabs,
  Screen,
  SearchField,
  StitchButton,
  StitchHeader,
  StitchModal,
  ProductCard,
} from "@/components/stitch";
import { PaymentPanel, type SplitLine } from "@/components/pos/PaymentPanel";
import {
  useCategoriesQuery,
  useCheckoutMutation,
  useCustomersQuery,
  useItemsQuery,
  useStaffQuery,
  useTableCheckoutMutation,
} from "@/hooks/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api-client";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { isModuleEnabled } from "@/lib/feature-modules";
import { cartSubtotal, useCartStore } from "@/stores/cart-store";
import { useBusinessStore } from "@/stores/business-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useUiStore } from "@/stores/ui-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ItemRow = {
  id: string;
  name: string;
  price: string | number;
  tax_rate: string | number;
  kind: string;
  is_active: boolean;
  image_url?: string | null;
  category_id?: string | null;
};

function PosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTableId = searchParams.get("tableId");
  const tableId = rawTableId && UUID_RE.test(rawTableId) ? rawTableId : null;

  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const { modules } = useEnabledModules();
  const canBill = current ? isModuleEnabled(modules, "billing") : false;
  const tablesModule = current ? isModuleEnabled(modules, "tables") : false;
  const tableMode = Boolean(tableId && tablesModule);

  const categoryFilter = usePosSessionStore((s) => s.categoryFilter);
  const setCategoryFilter = usePosSessionStore((s) => s.setCategoryFilter);
  const selectedCustomerId = usePosSessionStore((s) => s.selectedCustomerId);
  const setSelectedCustomerId = usePosSessionStore((s) => s.setSelectedCustomerId);
  const setSelectedTableId = usePosSessionStore((s) => s.setSelectedTableId);
  const paymentMethod = usePosSessionStore((s) => s.paymentMethod);
  const setPaymentMethod = usePosSessionStore((s) => s.setPaymentMethod);

  const modal = useUiStore((s) => s.modal);
  const openModal = useUiStore((s) => s.openModal);
  const closeModal = useUiStore((s) => s.closeModal);

  useEffect(() => {
    setSelectedTableId(tableId);
  }, [tableId, setSelectedTableId]);

  const staffQ = useStaffQuery(businessId);
  const categoriesQ = useCategoriesQuery(businessId);
  const canCustomers = isModuleEnabled(modules, "customers");
  const customersQ = useCustomersQuery(businessId, canCustomers);
  const [attributedStaffId, setAttributedStaffId] = useState<string>("");

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 280);
  const barcodeQuery =
    debouncedSearch.length >= 8 && /^[0-9A-Za-z-]+$/.test(debouncedSearch)
      ? debouncedSearch
      : null;

  const { data: items, isFetching } = useItemsQuery(
    businessId,
    undefined,
    barcodeQuery ? undefined : debouncedSearch,
    barcodeQuery
  );

  const lines = useCartStore((s) => s.lines);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const addLine = useCartStore((s) => s.addLine);
  const setQty = useCartStore((s) => s.setQty);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearCart = useCartStore((s) => s.clear);

  const [split, setSplit] = useState(false);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([{ method: "cash", amount: 0 }]);
  const [msg, setMsg] = useState<string | null>(null);

  const checkout = useCheckoutMutation();
  const tableCheckout = useTableCheckoutMutation();

  const { total } = useMemo(() => cartSubtotal(lines, discountAmount), [lines, discountAmount]);
  const totalRounded = Number(total.toFixed(2));

  const activeItems = useMemo(
    () => ((items as ItemRow[] | undefined) ?? []).filter((i) => i.is_active),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return activeItems;
    return activeItems.filter((i) => i.category_id === categoryFilter);
  }, [activeItems, categoryFilter]);

  const pillTabs = useMemo(() => {
    const base = [{ id: "all", label: "All" }];
    const cats = (categoriesQ.data ?? []).map((c) => ({ id: c.id, label: c.name }));
    return [...base, ...cats];
  }, [categoriesQ.data]);

  const selectedCustomerLabel = useMemo(() => {
    if (!selectedCustomerId) return null;
    const c = (customersQ.data ?? []).find((x) => x.id === selectedCustomerId);
    return c?.name ?? "Customer";
  }, [selectedCustomerId, customersQ.data]);

  function handleSplit(on: boolean) {
    setSplit(on);
    if (on) {
      setSplitLines([{ method: paymentMethod, amount: totalRounded }]);
    }
  }

  async function pay() {
    setMsg(null);
    if (!businessId) return;
    if (!lines.length) {
      setMsg("Add at least one line item.");
      return;
    }
    if (totalRounded <= 0) {
      setMsg("Total must be greater than zero.");
      return;
    }

    const linePayload = lines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineDiscount: l.lineDiscount > 0 ? l.lineDiscount : undefined,
    }));

    const staffAttr = attributedStaffId || null;
    const custId = selectedCustomerId || null;

    try {
      if (tableMode && tableId) {
        if (split) {
          const payments = splitLines
            .filter((l) => l.amount > 0)
            .map((l) => ({
              method: l.method,
              amount: Number(l.amount.toFixed(2)),
            }));
          const sum = payments.reduce((s, p) => s + p.amount, 0);
          if (sum + 1e-6 < totalRounded) {
            setMsg("Split amounts must cover the order total.");
            return;
          }
          await tableCheckout.mutateAsync({
            businessId,
            tableId,
            customerId: custId,
            lines: linePayload,
            discountAmount,
            payments,
            payment: undefined,
            attributedStaffId: staffAttr,
          });
        } else {
          await tableCheckout.mutateAsync({
            businessId,
            tableId,
            customerId: custId,
            lines: linePayload,
            discountAmount,
            payment: { method: paymentMethod, amount: totalRounded },
            payments: undefined,
            attributedStaffId: staffAttr,
          });
        }
        setMsg("Sale completed.");
        router.replace("/pos");
        return;
      }

      const base = {
        businessId,
        lines: linePayload,
        discountAmount,
        attributedStaffId: staffAttr,
        customerId: custId,
      };
      if (split) {
        const payments = splitLines
          .filter((l) => l.amount > 0)
          .map((l) => ({
            method: l.method,
            amount: Number(l.amount.toFixed(2)),
          }));
        const sum = payments.reduce((s, p) => s + p.amount, 0);
        if (sum + 1e-6 < totalRounded) {
          setMsg("Split amounts must cover the order total.");
          return;
        }
        await checkout.mutateAsync({ ...base, payments });
      } else {
        await checkout.mutateAsync({
          ...base,
          payment: { method: paymentMethod, amount: totalRounded },
        });
      }
      setMsg("Sale completed.");
    } catch (e) {
      const text =
        e instanceof ApiError
          ? e.status === 0
            ? "Network error — check your connection"
            : e.message
          : e instanceof Error
            ? e.message
            : "Checkout failed";
      setMsg(text);
    }
  }

  const paying = checkout.isPending || tableCheckout.isPending;

  return (
    <div className="relative min-h-dvh pb-[min(420px,50vh)]">
      <Screen className="!pb-4">
        <StitchHeader
          icon="point_of_sale"
          title="POS Billing"
          subtitle="Search, categories, cart & pay"
          right={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="relative rounded-full p-2 text-slate-400 hover:bg-stitch-surface"
                aria-label="Notifications"
              >
                <Icon name="notifications" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-stitch-primary" />
              </button>
            </div>
          }
        />

        {tableMode && tableId ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stitch-primary/30 bg-stitch-primary/10 px-3 py-2 text-sm text-rose-100">
            <span>Table service — one-step tab &amp; bill</span>
            <Link href="/pos" className="font-semibold text-stitch-primary underline">
              Clear
            </Link>
          </div>
        ) : null}

        {!businessId ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Choose a business in <strong>Setup</strong>.
          </div>
        ) : null}

        {businessId && !canBill ? (
          <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-slate-400">
            Billing module is off for this profile.
          </div>
        ) : null}

        {businessId && (staffQ.data?.length ?? 0) > 0 ? (
          <label className="mb-4 block text-xs text-slate-500">
            Staff
            <select
              value={attributedStaffId}
              onChange={(e) => setAttributedStaffId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stitch-border bg-stitch-surface px-3 py-3 text-sm text-slate-100"
            >
              <option value="">—</option>
              {(staffQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canCustomers ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StitchButton
              variant="secondary"
              className="min-h-[44px] flex-1"
              onClick={() => openModal("customer")}
            >
              {selectedCustomerLabel ? selectedCustomerLabel : "Customer"}
            </StitchButton>
            {selectedCustomerId ? (
              <StitchButton
                variant="ghost"
                className="min-h-[44px]"
                onClick={() => setSelectedCustomerId(null)}
              >
                Clear
              </StitchButton>
            ) : null}
          </div>
        ) : null}

        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search SKU or product name..."
          className="mb-4"
        />

        <PillTabs tabs={pillTabs} value={categoryFilter} onChange={setCategoryFilter} className="mb-4" />

        {isFetching ? (
          <p className="mb-2 text-xs text-slate-500" aria-live="polite">
            Loading…
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {filteredItems.map((it) => (
            <ProductCard
              key={it.id}
              name={it.name}
              priceLabel={`₹${Number(it.price).toFixed(2)}`}
              imageUrl={it.image_url}
              kindHint={it.kind}
              onClick={() =>
                addLine({
                  itemId: it.id,
                  name: it.name,
                  unitPrice: Number(it.price),
                  taxRate: Number(it.tax_rate),
                })
              }
            />
          ))}
        </div>
        {filteredItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {searchInput.trim() ? "No matches." : "No items — add under Items."}
          </p>
        ) : null}
      </Screen>

      {/* Sticky checkout — above bottom nav (stitch POS) */}
      <div
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 mx-auto max-w-lg px-3"
        style={{ paddingBottom: 0 }}
      >
        <div className="max-h-[42vh] overflow-y-auto rounded-t-2xl border border-stitch-border bg-stitch-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-stitch-border px-4 py-3">
            <h2 className="text-lg font-bold text-slate-100">Current order</h2>
            <button
              type="button"
              onClick={() => {
                clearCart();
                setDiscount(0);
              }}
              className="text-sm font-semibold text-stitch-primary"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-3 p-4">
            {lines.length === 0 ? (
              <p className="text-sm text-slate-500">Tap products to add lines.</p>
            ) : (
              lines.map((l) => (
                <div key={l.itemId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100">{l.name}</p>
                    <p className="text-xs text-slate-500">₹{l.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-stitch-border bg-stitch-bg"
                      onClick={() => setQty(l.itemId, l.quantity - 1)}
                    >
                      <Icon name="remove" className="text-sm" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-stitch-border bg-stitch-bg"
                      onClick={() => setQty(l.itemId, l.quantity + 1)}
                    >
                      <Icon name="add" className="text-sm" />
                    </button>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-slate-100">
                    ₹{(l.unitPrice * l.quantity - l.lineDiscount).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3 border-t border-stitch-border bg-stitch-bg/80 p-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span className="tabular-nums text-slate-200">
                ₹{cartSubtotal(lines, 0).gross.toFixed(2)}
              </span>
            </div>
            <label className="flex justify-between text-sm text-slate-400">
              <span>Discount (₹)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className="w-24 rounded-lg border border-stitch-border bg-stitch-surface px-2 py-1 text-right text-slate-100"
                value={discountAmount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </label>
            <div className="flex justify-between text-lg font-bold text-slate-50">
              <span>Total</span>
              <span className="tabular-nums">₹{totalRounded.toFixed(2)}</span>
            </div>
            <PaymentPanel
              orderTotal={totalRounded}
              method={paymentMethod}
              onMethod={setPaymentMethod}
              split={split}
              onSplit={handleSplit}
              splitLines={splitLines}
              onSplitLines={setSplitLines}
              onPay={pay}
              disabled={!businessId || !canBill || !lines.length || paying}
              busy={paying}
            />
          </div>
        </div>
      </div>

      <StitchModal
        open={modal === "customer"}
        title="Select customer"
        onClose={() => closeModal()}
      >
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {(customersQ.data ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-stitch-border bg-stitch-card px-3 py-3 text-left text-sm hover:border-stitch-primary"
              onClick={() => {
                setSelectedCustomerId(c.id);
                closeModal();
              }}
            >
              <span className="font-semibold text-slate-100">{c.name}</span>
            </button>
          ))}
          {(customersQ.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No customers — add in People.</p>
          ) : null}
        </div>
      </StitchModal>

      {msg ? (
        <p
          className={`fixed bottom-32 left-0 right-0 z-40 text-center text-sm ${
            msg.startsWith("Sale completed") ? "text-emerald-400" : "text-rose-400"
          }`}
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
          Loading POS…
        </div>
      }
    >
      <PosContent />
    </Suspense>
  );
}
