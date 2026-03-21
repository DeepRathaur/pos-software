"use client";

import type { CartLine } from "@/stores/cart-store";
import { cartSubtotal } from "@/stores/cart-store";

export function CartPanel({
  lines,
  discountAmount,
  onChangeQty,
  onRemove,
  onDiscountChange,
  onLineDiscountChange,
}: {
  lines: CartLine[];
  discountAmount: number;
  onChangeQty: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  onDiscountChange: (n: number) => void;
  onLineDiscountChange: (itemId: string, amount: number) => void;
}) {
  const { gross, discount: appliedDiscount, net, tax, total } = cartSubtotal(
    lines,
    discountAmount
  );
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Cart</h2>
        <span className="text-xs text-zinc-500">{lines.length} lines</span>
      </div>
      <div className="mt-3 space-y-2">
        {lines.length === 0 ? (
          <p className="text-sm text-zinc-500">Tap items to add to the sale.</p>
        ) : (
          lines.map((l) => (
            <div
              key={l.itemId}
              className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-2"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-zinc-100">{l.name}</p>
                <p className="text-xs text-zinc-500">₹{l.unitPrice.toFixed(2)} each</p>
                <label className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <span className="shrink-0">Line ₹ off</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-right text-xs text-zinc-200"
                    value={l.lineDiscount}
                    onChange={(e) =>
                      onLineDiscountChange(l.itemId, Number(e.target.value) || 0)
                    }
                  />
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-lg font-semibold text-zinc-100"
                  onClick={() => onChangeQty(l.itemId, l.quantity - 1)}
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-lg font-semibold text-zinc-100"
                  onClick={() => onChangeQty(l.itemId, l.quantity + 1)}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="text-xs text-rose-400"
                onClick={() => onRemove(l.itemId)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>Subtotal</span>
          <span className="tabular-nums text-zinc-200">₹{gross.toFixed(2)}</span>
        </div>
        <label className="flex items-center justify-between gap-2 text-zinc-400">
          <span>Discount (₹)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-right text-zinc-100"
            value={discountAmount}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
          />
        </label>
        {appliedDiscount > 0 ? (
          <div className="flex justify-between text-xs text-emerald-300/90">
            <span>Applied</span>
            <span className="tabular-nums">−₹{appliedDiscount.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-zinc-400">
          <span>After discount</span>
          <span className="tabular-nums text-zinc-200">₹{net.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Tax (est.)</span>
          <span className="tabular-nums text-zinc-200">₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-zinc-50">
          <span>Total</span>
          <span className="tabular-nums">₹{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
