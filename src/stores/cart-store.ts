import { create } from "zustand";

export type CartLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  /** Per-line discount in currency (same as unit price currency) */
  lineDiscount: number;
};

type CartState = {
  lines: CartLine[];
  /** Order-level discount (applied after line subtotals) */
  discountAmount: number;
  addLine: (line: Omit<CartLine, "quantity" | "lineDiscount"> & { quantity?: number; lineDiscount?: number }) => void;
  setQty: (itemId: string, quantity: number) => void;
  setLineDiscount: (itemId: string, lineDiscount: number) => void;
  removeLine: (itemId: string) => void;
  setDiscount: (amount: number) => void;
  clear: () => void;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Line net before tax: qty * price - line discount */
export function lineNet(line: CartLine) {
  const raw = line.unitPrice * line.quantity - Math.max(0, line.lineDiscount);
  return Math.max(0, round2(raw));
}

/**
 * Mirrors server checkout: sum line nets, apply order discount, scale tax.
 * Tax is applied to each line’s share of the post-discount subtotal.
 */
export function cartSubtotal(lines: CartLine[], orderDiscount: number) {
  const lineNets = lines.map((l) => lineNet(l));
  const gross = round2(lineNets.reduce((s, n) => s + n, 0));
  const disc = Math.min(Math.max(0, orderDiscount), gross);
  const net = round2(gross - disc);

  const tax = lines.reduce((s, l) => {
    const ln = lineNet(l);
    const share = gross > 0 ? ln / gross : 0;
    const afterOrderDisc = net * share;
    return s + afterOrderDisc * (l.taxRate / 100);
  }, 0);

  return {
    gross,
    discount: disc,
    net,
    tax: round2(tax),
    total: round2(net + tax),
  };
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  discountAmount: 0,
  addLine: (line) =>
    set((s) => {
      const existing = s.lines.find((x) => x.itemId === line.itemId);
      const ld = Math.max(0, line.lineDiscount ?? existing?.lineDiscount ?? 0);
      const qty = (existing?.quantity ?? 0) + (line.quantity ?? 1);
      const next = existing
        ? s.lines.map((x) =>
            x.itemId === line.itemId
              ? {
                  ...x,
                  quantity: qty,
                  unitPrice: line.unitPrice,
                  taxRate: line.taxRate,
                  lineDiscount: ld,
                }
              : x
          )
        : [
            ...s.lines,
            {
              itemId: line.itemId,
              name: line.name,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              quantity: line.quantity ?? 1,
              lineDiscount: ld,
            },
          ];
      return { lines: next };
    }),
  setQty: (itemId, quantity) =>
    set((s) => ({
      lines:
        quantity <= 0
          ? s.lines.filter((l) => l.itemId !== itemId)
          : s.lines.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)),
    })),
  setLineDiscount: (itemId, lineDiscount) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.itemId === itemId ? { ...l, lineDiscount: Math.max(0, lineDiscount) } : l
      ),
    })),
  removeLine: (itemId) => set((s) => ({ lines: s.lines.filter((l) => l.itemId !== itemId) })),
  setDiscount: (amount) => set({ discountAmount: Math.max(0, amount) }),
  clear: () => set({ lines: [], discountAmount: 0 }),
}));
