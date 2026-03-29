import { create } from "zustand";

export type CartPaymentMethod = "cash" | "upi" | "card" | "other";

type PosSessionState = {
  selectedTableId: string | null;
  selectedCustomerId: string | null;
  /** Category id or "all" */
  categoryFilter: "all" | string;
  paymentMethod: CartPaymentMethod;
  setSelectedTableId: (id: string | null) => void;
  setSelectedCustomerId: (id: string | null) => void;
  setCategoryFilter: (id: "all" | string) => void;
  setPaymentMethod: (m: CartPaymentMethod) => void;
  resetSession: () => void;
};

export const usePosSessionStore = create<PosSessionState>((set) => ({
  selectedTableId: null,
  selectedCustomerId: null,
  categoryFilter: "all",
  paymentMethod: "cash",
  setSelectedTableId: (id) => set({ selectedTableId: id }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  setCategoryFilter: (id) => set({ categoryFilter: id }),
  setPaymentMethod: (m) => set({ paymentMethod: m }),
  resetSession: () =>
    set({
      selectedTableId: null,
      selectedCustomerId: null,
      categoryFilter: "all",
      paymentMethod: "cash",
    }),
}));
