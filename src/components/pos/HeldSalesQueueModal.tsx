"use client";

import { useMemo } from "react";
import { StitchButton, StitchModal } from "@/components/stitch";
import { cartSubtotal } from "@/stores/cart-store";
import type { HeldSale } from "@/stores/pos-held-sales-store";

type CustomerRow = { id: string; name: string };

export function HeldSalesQueueModal({
  open,
  onClose,
  queue,
  customers,
  onResume,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  queue: HeldSale[];
  customers: CustomerRow[];
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const customerById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.id, c.name);
    return m;
  }, [customers]);

  return (
    <StitchModal open={open} title="Held sales" onClose={onClose}>
      {queue.length === 0 ? (
        <p className="text-sm text-stitch-fg-muted">No held sales. Use &quot;Hold sale&quot; on the cart.</p>
      ) : (
        <ul className="space-y-3">
          {queue.map((h, index) => {
            const { total } = cartSubtotal(h.lines, h.discountAmount);
            const cust = h.customerId ? customerById.get(h.customerId) : null;
            const timeLabel = new Date(h.heldAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li
                key={h.id}
                className="rounded-xl border border-stitch-border bg-stitch-card p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-stitch-fg">
                    Hold {index + 1} · {timeLabel}
                  </span>
                  <span className="tabular-nums font-bold text-stitch-fg">₹{total.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-stitch-fg-muted">
                  {h.lines.length} line{h.lines.length === 1 ? "" : "s"}
                  {cust ? ` · ${cust}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StitchButton className="min-h-[44px] flex-1" onClick={() => onResume(h.id)}>
                    Resume
                  </StitchButton>
                  <StitchButton
                    variant="secondary"
                    className="min-h-[44px] flex-1"
                    onClick={() => onRemove(h.id)}
                  >
                    Delete
                  </StitchButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </StitchModal>
  );
}
