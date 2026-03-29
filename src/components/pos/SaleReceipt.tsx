"use client";

import { cartSubtotal, lineNet, type CartLine } from "@/stores/cart-store";

export type SaleReceiptProps = {
  businessName: string;
  lines: CartLine[];
  discountAmount: number;
  paymentSummary: string;
  orderId?: string | null;
  customerName?: string | null;
  createdAt: Date;
  /** Wrapper id for print CSS targeting */
  printRootClassName?: string;
};

export function SaleReceipt({
  businessName,
  lines,
  discountAmount,
  paymentSummary,
  orderId,
  customerName,
  createdAt,
  printRootClassName = "receipt-print-root",
}: SaleReceiptProps) {
  const { gross, tax, total } = cartSubtotal(lines, discountAmount);

  return (
    <div className={`${printRootClassName} mx-auto max-w-sm rounded-xl border border-stitch-border bg-white p-4 text-black shadow-sm`}>
      <div className="text-center">
        <p className="text-lg font-bold">{businessName}</p>
        <p className="text-xs text-neutral-600">
          {createdAt.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
      <div className="my-3 border-t border-neutral-300" />
      {customerName ? (
        <p className="mb-2 text-sm text-neutral-800">
          Customer: <span className="font-medium">{customerName}</span>
        </p>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-neutral-600">
            <th className="pb-1 font-normal">Item</th>
            <th className="pb-1 text-right font-normal">Amt</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.itemId}>
              <td className="py-0.5 pr-2 align-top">
                <span className="font-medium">{l.name}</span>
                <span className="text-neutral-600">
                  {" "}
                  ×{l.quantity}
                </span>
              </td>
              <td className="py-0.5 text-right tabular-nums">₹{lineNet(l).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-2 border-t border-neutral-300" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-neutral-700">
          <span>Subtotal</span>
          <span className="tabular-nums">₹{gross.toFixed(2)}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="flex justify-between text-neutral-700">
            <span>Discount</span>
            <span className="tabular-nums">−₹{discountAmount.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-neutral-700">
          <span>Tax</span>
          <span className="tabular-nums">₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-1 text-neutral-800">
          <span>Payment</span>
          <span className="text-right font-medium">{paymentSummary}</span>
        </div>
      </div>
      {orderId ? (
        <>
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <p className="text-center text-xs text-neutral-600">
            Order ID
            <br />
            <span className="font-mono text-sm font-semibold text-black">{orderId}</span>
          </p>
        </>
      ) : null}
      <p className="mt-4 text-center text-xs text-neutral-500">Thank you</p>
    </div>
  );
}
