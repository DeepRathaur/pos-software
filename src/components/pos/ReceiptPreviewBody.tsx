"use client";

import { SaleReceipt } from "@/components/pos/SaleReceipt";
import type { CartLine } from "@/stores/cart-store";

export function ReceiptPreviewBody({
  businessName,
  lines,
  discountAmount,
  paymentSummary,
  customerName,
}: {
  businessName: string;
  lines: CartLine[];
  discountAmount: number;
  paymentSummary: string;
  customerName: string | null;
}) {
  return (
    <div className="space-y-4">
      <SaleReceipt
        businessName={businessName}
        lines={lines}
        discountAmount={discountAmount}
        paymentSummary={paymentSummary}
        orderId={null}
        customerName={customerName}
        createdAt={new Date()}
      />
      <p className="text-center text-xs text-stitch-fg-muted">
        This is a preview. No payment has been recorded yet.
      </p>
    </div>
  );
}
