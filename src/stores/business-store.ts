import { create } from "zustand";

export type BusinessRow = {
  id: string;
  name: string;
  business_type: string;
  enabled_modules: string[];
  settings?: Record<string, unknown>;
};

type BizState = {
  currentBusinessId: string | null;
  businesses: BusinessRow[];
  hydrate: () => void;
  setCurrent: (id: string | null) => void;
  setBusinesses: (rows: BusinessRow[]) => void;
};

const BID_KEY = "pos_business_id";

export const useBusinessStore = create<BizState>((set, get) => ({
  currentBusinessId: null,
  businesses: [],
  hydrate: () => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem(BID_KEY);
    set({ currentBusinessId: id });
  },
  setCurrent: (id) => {
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(BID_KEY, id);
      else localStorage.removeItem(BID_KEY);
    }
    set({ currentBusinessId: id });
  },
  setBusinesses: (rows) => {
    if (!rows.length) {
      if (typeof window !== "undefined") localStorage.removeItem(BID_KEY);
      set({ businesses: [], currentBusinessId: null });
      return;
    }
    set({ businesses: rows });
    const cur = get().currentBusinessId;
    if (!cur) {
      get().setCurrent(rows[0].id);
    } else if (!rows.some((r) => r.id === cur)) {
      get().setCurrent(rows[0].id);
    }
  },
}));
