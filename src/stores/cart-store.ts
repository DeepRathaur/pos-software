import { create } from "zustand";

export type CartLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
};

type CartState = {
  lines: CartLine[];
  discountAmount: number;
  addLine: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  setQty: (itemId: string, quantity: number) => void;
  removeLine: (itemId: string) => void;
  setDiscount: (amount: number) => void;
  clear: () => void;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function cartSubtotal(lines: CartLine[], discount: number) {
  const gross = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const disc = Math.min(discount, gross);
  const net = Math.max(0, gross - disc);
  const tax = lines.reduce((s, l) => {
    const lineGross = l.unitPrice * l.quantity;
    const lineShare = gross > 0 ? lineGross / gross : 0;
    const lineNet = net * lineShare;
    return s + lineNet * (l.taxRate / 100);
  }, 0);
  return { gross, discount: disc, net, tax: round2(tax), total: round2(net + tax) };
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  discountAmount: 0,
  addLine: (line) =>
    set((s) => {
      const existing = s.lines.find((x) => x.itemId === line.itemId);
      const qty = (existing?.quantity ?? 0) + (line.quantity ?? 1);
      const next = existing
        ? s.lines.map((x) =>
            x.itemId === line.itemId
              ? { ...x, quantity: qty, unitPrice: line.unitPrice, taxRate: line.taxRate }
              : x
          )
        : [...s.lines, { ...line, quantity: line.quantity ?? 1 }];
      return { lines: next };
    }),
  setQty: (itemId, quantity) =>
    set((s) => ({
      lines:
        quantity <= 0
          ? s.lines.filter((l) => l.itemId !== itemId)
          : s.lines.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)),
    })),
  removeLine: (itemId) => set((s) => ({ lines: s.lines.filter((l) => l.itemId !== itemId) })),
  setDiscount: (amount) => set({ discountAmount: Math.max(0, amount) }),
  clear: () => set({ lines: [], discountAmount: 0 }),
}));
