"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentPanel } from "@/components/pos/PaymentPanel";
import { useCheckoutMutation, useItemsQuery } from "@/hooks/queries";
import { cartSubtotal, useCartStore } from "@/stores/cart-store";
import { useBusinessStore } from "@/stores/business-store";
import { hasModule } from "@/lib/modules-client";

type ItemRow = {
  id: string;
  name: string;
  price: string | number;
  tax_rate: string | number;
  kind: string;
  is_active: boolean;
};

export default function PosPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canBill = current ? hasModule(current.enabled_modules, "billing") : false;

  const { data: items } = useItemsQuery(businessId);
  const lines = useCartStore((s) => s.lines);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const addLine = useCartStore((s) => s.addLine);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clear = useCartStore((s) => s.clear);

  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [msg, setMsg] = useState<string | null>(null);
  const checkout = useCheckoutMutation();

  const { total } = useMemo(() => cartSubtotal(lines, discountAmount), [lines, discountAmount]);

  const activeItems = useMemo(
    () => ((items as ItemRow[] | undefined) ?? []).filter((i) => i.is_active),
    [items]
  );

  async function pay() {
    setMsg(null);
    if (!businessId) return;
    if (!lines.length) {
      setMsg("Add at least one line item.");
      return;
    }
    try {
      await checkout.mutateAsync({
        businessId,
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
        discountAmount,
        payment: { method, amount: Number(total.toFixed(2)) },
      });
      clear();
      setMsg("Sale completed.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">POS</h1>
        <p className="text-sm text-zinc-500">Large tap targets, fast checkout.</p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Choose a business in <strong>Setup</strong> before selling.
        </div>
      ) : null}

      {businessId && !canBill ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          Billing module is off for this profile.
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-300">Catalog</h2>
        <ProductGrid
          items={activeItems}
          onAdd={(it) =>
            addLine({
              itemId: it.id,
              name: it.name,
              unitPrice: Number(it.price),
              taxRate: Number(it.tax_rate),
            })
          }
        />
      </section>

      <CartPanel
        lines={lines}
        discountAmount={discountAmount}
        onChangeQty={setQty}
        onRemove={removeLine}
        onDiscountChange={setDiscount}
      />

      <PaymentPanel
        method={method}
        onMethod={setMethod}
        onPay={pay}
        disabled={!businessId || !canBill || !lines.length}
        busy={checkout.isPending}
      />

      {msg ? (
        <p className="text-center text-sm text-emerald-300" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
