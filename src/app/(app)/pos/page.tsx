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
import { HeldSalesQueueModal } from "@/components/pos/HeldSalesQueueModal";
import { PaymentPanel, type SplitLine } from "@/components/pos/PaymentPanel";
import { PaymentCollectStep } from "@/components/pos/PaymentCollectStep";
import { ReceiptPreviewBody } from "@/components/pos/ReceiptPreviewBody";
import { SaleReceipt } from "@/components/pos/SaleReceipt";
import { formatPaymentSummary } from "@/lib/pos-payment-summary";
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
import { cartSubtotal, type CartLine, useCartStore } from "@/stores/cart-store";
import { useBusinessStore } from "@/stores/business-store";
import { usePosHeldSalesStore } from "@/stores/pos-held-sales-store";
import { usePosSessionStore } from "@/stores/pos-session-store";
import { useUiStore } from "@/stores/ui-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOrderId(res: unknown): string | null {
  if (!res || typeof res !== "object" || !("order" in res)) return null;
  const order = (res as { order: unknown }).order;
  if (!order || typeof order !== "object" || !("id" in order)) return null;
  const id = (order as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

type ReceiptSnapshot = {
  lines: CartLine[];
  discountAmount: number;
  paymentSummary: string;
};

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

  const setHeldBusinessContext = usePosHeldSalesStore((s) => s.setBusinessContext);
  const heldQueue = usePosHeldSalesStore((s) => s.queue);
  const holdCurrentSale = usePosHeldSalesStore((s) => s.holdCurrentSale);
  const resumeHeldSale = usePosHeldSalesStore((s) => s.resumeSale);
  const removeHeldSale = usePosHeldSalesStore((s) => s.removeHeld);

  useEffect(() => {
    setHeldBusinessContext(businessId ?? null);
  }, [businessId, setHeldBusinessContext]);

  const [heldQueueModalOpen, setHeldQueueModalOpen] = useState(false);

  /** md+: cart always expanded. Mobile: compact bar by default; user toggles full cart. */
  const [posCartLayout, setPosCartLayout] = useState<{ isMdUp: boolean; cartExpanded: boolean }>({
    isMdUp: false,
    cartExpanded: false,
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      const isMdUp = mq.matches;
      setPosCartLayout((prev) => {
        if (isMdUp) return { isMdUp: true, cartExpanded: true };
        return { isMdUp: false, cartExpanded: false };
      });
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { isMdUp, cartExpanded } = posCartLayout;
  const setCartExpanded = (v: boolean) =>
    setPosCartLayout((s) => (s.isMdUp ? s : { ...s, cartExpanded: v }));

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

  const [checkoutStep, setCheckoutStep] = useState<"idle" | "preview" | "collect" | "success">(
    "idle"
  );
  const [receiptSnapshot, setReceiptSnapshot] = useState<ReceiptSnapshot | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [saleCompletedAt, setSaleCompletedAt] = useState<Date | null>(null);

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

  function resetSplitToSessionPayment() {
    const pm = usePosSessionStore.getState().paymentMethod;
    setSplit(false);
    setSplitLines([{ method: pm, amount: 0 }]);
  }

  function handleHoldSale() {
    setMsg(null);
    const r = holdCurrentSale();
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    resetSplitToSessionPayment();
  }

  function handleResumeHeld(id: string) {
    setMsg(null);
    const r = resumeHeldSale(id);
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    setHeldQueueModalOpen(false);
    resetSplitToSessionPayment();
  }

  function handleRemoveHeld(id: string) {
    removeHeldSale(id);
  }

  function resetCheckoutFlow() {
    setCheckoutStep("idle");
    setReceiptSnapshot(null);
    setCompletedOrderId(null);
    setSaleCompletedAt(null);
  }

  function dismissSaleSuccess() {
    resetCheckoutFlow();
    if (tableMode && tableId) {
      router.replace("/pos");
    }
  }

  function handleCheckoutModalClose() {
    if (checkoutStep === "preview") resetCheckoutFlow();
    else if (checkoutStep === "collect") setCheckoutStep("preview");
    else if (checkoutStep === "success") dismissSaleSuccess();
  }

  function validateCheckoutReady(): boolean {
    if (!businessId) return false;
    if (!lines.length) {
      setMsg("Add at least one line item.");
      return false;
    }
    if (totalRounded <= 0) {
      setMsg("Total must be greater than zero.");
      return false;
    }
    if (split) {
      const payments = splitLines
        .filter((l) => l.amount > 0)
        .map((l) => Number(l.amount.toFixed(2)));
      const sum = payments.reduce((s, p) => s + p, 0);
      if (sum + 1e-6 < totalRounded) {
        setMsg("Split amounts must cover the order total.");
        return false;
      }
    }
    return true;
  }

  function startCheckout() {
    setMsg(null);
    if (!validateCheckoutReady()) return;
    setCheckoutStep("preview");
  }

  async function finalizeCheckout() {
    setMsg(null);
    if (!businessId) return;
    if (!validateCheckoutReady()) return;

    const paymentSummary = formatPaymentSummary(
      split,
      paymentMethod,
      splitLines,
      totalRounded
    );
    const snap: ReceiptSnapshot = {
      lines: lines.map((l) => ({ ...l })),
      discountAmount,
      paymentSummary,
    };

    const linePayload = lines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineDiscount: l.lineDiscount > 0 ? l.lineDiscount : undefined,
    }));

    const staffAttr = attributedStaffId || null;
    const custId = selectedCustomerId || null;

    try {
      let res: unknown;
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
          res = await tableCheckout.mutateAsync({
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
          res = await tableCheckout.mutateAsync({
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
      } else {
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
          res = await checkout.mutateAsync({ ...base, payments });
        } else {
          res = await checkout.mutateAsync({
            ...base,
            payment: { method: paymentMethod, amount: totalRounded },
          });
        }
      }

      const orderId = parseOrderId(res);
      setReceiptSnapshot(snap);
      setCompletedOrderId(orderId);
      setSaleCompletedAt(new Date());
      setCheckoutStep("success");
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

  const navBase = "4.5rem + env(safe-area-inset-bottom, 0px)";
  const rootPadBottom =
    isMdUp
      ? "min(420px, 45vh)"
      : cartExpanded
        ? `calc(${navBase} + min(34vh, 300px))`
        : `calc(${navBase} + 3.75rem)`;

  const showCompactCartBar = !isMdUp && !cartExpanded;

  return (
    <div
      className="print-pos-root relative min-h-dvh"
      style={{ paddingBottom: rootPadBottom }}
    >
      <Screen className="!pb-4">
        <StitchHeader
          icon="point_of_sale"
          title="POS Billing"
          subtitle="Search, categories, cart & pay"
          right={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="relative rounded-full p-2 text-stitch-fg-muted hover:bg-stitch-surface"
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
          <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-stitch-fg-muted">
            Billing module is off for this profile.
          </div>
        ) : null}

        {businessId && (staffQ.data?.length ?? 0) > 0 ? (
          <label className="mb-4 block text-xs text-stitch-fg-muted">
            Staff
            <select
              value={attributedStaffId}
              onChange={(e) => setAttributedStaffId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stitch-border bg-stitch-surface px-3 py-3 text-sm text-stitch-fg"
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
          <p className="mb-2 text-xs text-stitch-fg-muted" aria-live="polite">
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
          <p className="py-10 text-center text-sm text-stitch-fg-muted">
            {searchInput.trim() ? "No matches." : "No items — add under Items."}
          </p>
        ) : null}
      </Screen>

      {/* Sticky checkout — above bottom nav (stitch POS) */}
      <div
        className="no-print fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 mx-auto max-w-lg px-3"
        style={{ paddingBottom: 0 }}
      >
        {showCompactCartBar ? (
          <button
            type="button"
            onClick={() => setCartExpanded(true)}
            className="flex w-full items-center justify-between gap-3 rounded-t-2xl border border-stitch-border bg-stitch-surface px-4 py-3 text-left shadow-2xl active:bg-stitch-card"
            aria-expanded={false}
            aria-label="Expand current order"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-stitch-fg">Current order</p>
              <p className="text-xs text-stitch-fg-muted">
                {lines.length === 0
                  ? "Tap products to add items"
                  : `${lines.length} line${lines.length === 1 ? "" : "s"} · ₹${totalRounded.toFixed(2)}`}
              </p>
            </div>
            <Icon name="expand_less" className="shrink-0 text-stitch-fg-muted" aria-hidden />
          </button>
        ) : (
          <div className="max-h-[min(32vh,320px)] overflow-y-auto rounded-t-2xl border border-stitch-border bg-stitch-surface shadow-2xl md:max-h-[42vh]">
            <div className="flex items-center justify-between border-b border-stitch-border px-4 py-3">
              <h2 className="text-lg font-bold text-stitch-fg">Current order</h2>
              <div className="flex items-center gap-2">
                {!isMdUp ? (
                  <button
                    type="button"
                    onClick={() => setCartExpanded(false)}
                    className="rounded-lg p-2 text-stitch-fg-muted hover:bg-stitch-bg"
                    aria-label="Collapse cart"
                  >
                    <Icon name="expand_more" className="text-xl" />
                  </button>
                ) : null}
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
            </div>
            <div className="space-y-3 p-4">
              {lines.length === 0 ? (
                <p className="text-sm text-stitch-fg-muted">Tap products to add lines.</p>
              ) : (
                lines.map((l) => (
                  <div key={l.itemId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stitch-fg">{l.name}</p>
                      <p className="text-xs text-stitch-fg-muted">₹{l.unitPrice.toFixed(2)} each</p>
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
                    <p className="text-sm font-bold tabular-nums text-stitch-fg">
                      ₹{(l.unitPrice * l.quantity - l.lineDiscount).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 border-t border-stitch-border bg-stitch-bg/80 p-4">
              <div className="flex justify-between text-sm text-stitch-fg-muted">
                <span>Subtotal</span>
                <span className="tabular-nums text-stitch-fg-secondary">
                  ₹{cartSubtotal(lines, 0).gross.toFixed(2)}
                </span>
              </div>
              <label className="flex justify-between text-sm text-stitch-fg-muted">
                <span>Discount (₹)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="w-24 rounded-lg border border-stitch-border bg-stitch-surface px-2 py-1 text-right text-stitch-fg"
                  value={discountAmount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                />
              </label>
              <div className="flex justify-between text-lg font-bold text-stitch-fg">
                <span>Total</span>
                <span className="tabular-nums">₹{totalRounded.toFixed(2)}</span>
              </div>
              {/* Held queue is walk-in only; table tabs use server open orders. */}
              {!tableMode && businessId && canBill ? (
                <div className="flex gap-2">
                  <StitchButton
                    variant="secondary"
                    className="min-h-[44px] flex-1 disabled:opacity-50"
                    disabled={
                      !lines.length || paying || checkoutStep !== "idle"
                    }
                    onClick={handleHoldSale}
                  >
                    Hold sale
                  </StitchButton>
                  <StitchButton
                    variant="secondary"
                    className="min-h-[44px] flex-1"
                    onClick={() => {
                      setMsg(null);
                      setHeldQueueModalOpen(true);
                    }}
                  >
                    Queue
                    {heldQueue.length > 0 ? (
                      <span className="ml-1 rounded-full bg-stitch-primary/20 px-2 py-0.5 text-xs font-bold text-stitch-primary">
                        {heldQueue.length}
                      </span>
                    ) : null}
                  </StitchButton>
                </div>
              ) : null}
              <PaymentPanel
                orderTotal={totalRounded}
                method={paymentMethod}
                onMethod={setPaymentMethod}
                split={split}
                onSplit={handleSplit}
                splitLines={splitLines}
                onSplitLines={setSplitLines}
                onPay={startCheckout}
                disabled={!businessId || !canBill || !lines.length || paying || checkoutStep !== "idle"}
                busy={paying}
              />
            </div>
          </div>
        )}
      </div>

      <StitchModal
        open={checkoutStep !== "idle"}
        title={
          checkoutStep === "preview"
            ? "Receipt preview"
            : checkoutStep === "collect"
              ? "Collect payment"
              : "Sale complete"
        }
        onClose={handleCheckoutModalClose}
      >
        {checkoutStep === "preview" ? (
          <>
            <ReceiptPreviewBody
              businessName={current?.name ?? "Business"}
              lines={lines}
              discountAmount={discountAmount}
              paymentSummary={formatPaymentSummary(
                split,
                paymentMethod,
                splitLines,
                totalRounded
              )}
              customerName={selectedCustomerLabel}
            />
            <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <StitchButton
                className="min-h-[48px] flex-1"
                onClick={() => setCheckoutStep("collect")}
              >
                Proceed to payment
              </StitchButton>
              <StitchButton
                variant="secondary"
                className="min-h-[48px] flex-1"
                onClick={resetCheckoutFlow}
              >
                Cancel
              </StitchButton>
            </div>
          </>
        ) : null}
        {checkoutStep === "collect" ? (
          <PaymentCollectStep
            business={current}
            totalRounded={totalRounded}
            split={split}
            paymentMethod={paymentMethod}
            splitLines={splitLines}
            onConfirmComplete={finalizeCheckout}
            onBack={() => setCheckoutStep("preview")}
            busy={paying}
          />
        ) : null}
        {checkoutStep === "success" && receiptSnapshot ? (
          <>
            <p className="no-print mb-3 text-center text-sm text-emerald-400">
              Payment recorded successfully.
            </p>
            <SaleReceipt
              businessName={current?.name ?? "Business"}
              lines={receiptSnapshot.lines}
              discountAmount={receiptSnapshot.discountAmount}
              paymentSummary={receiptSnapshot.paymentSummary}
              orderId={completedOrderId}
              customerName={selectedCustomerLabel}
              createdAt={saleCompletedAt ?? new Date()}
            />
            <div className="no-print mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[48px] rounded-2xl border border-stitch-border bg-stitch-surface text-sm font-semibold text-stitch-fg"
              >
                Print receipt
              </button>
              <StitchButton className="min-h-[48px]" onClick={dismissSaleSuccess}>
                Done
              </StitchButton>
            </div>
          </>
        ) : null}
      </StitchModal>

      <HeldSalesQueueModal
        open={heldQueueModalOpen}
        onClose={() => setHeldQueueModalOpen(false)}
        queue={heldQueue}
        customers={(customersQ.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
        onResume={handleResumeHeld}
        onRemove={handleRemoveHeld}
      />

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
              <span className="font-semibold text-stitch-fg">{c.name}</span>
            </button>
          ))}
          {(customersQ.data ?? []).length === 0 ? (
            <p className="text-sm text-stitch-fg-muted">No customers — add in People.</p>
          ) : null}
        </div>
      </StitchModal>

      {msg ? (
        <p className="no-print fixed bottom-32 left-0 right-0 z-40 text-center text-sm text-rose-400" role="status">
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
        <div className="flex min-h-dvh items-center justify-center text-sm text-stitch-fg-muted">
          Loading POS…
        </div>
      }
    >
      <PosContent />
    </Suspense>
  );
}
