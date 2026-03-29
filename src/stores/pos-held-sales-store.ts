import { create } from "zustand";
import type { CartLine } from "@/stores/cart-store";
import { useCartStore } from "@/stores/cart-store";
import type { CartPaymentMethod } from "@/stores/pos-session-store";
import { usePosSessionStore } from "@/stores/pos-session-store";

/**
 * Max held sales per business (memory + localStorage).
 * Caps growth so tablets do not accumulate unbounded snapshots.
 */
const MAX_HELD = 10;

const PAYMENT_METHODS: CartPaymentMethod[] = ["cash", "upi", "card", "other"];

function parsePaymentMethod(v: unknown): CartPaymentMethod {
  return PAYMENT_METHODS.includes(v as CartPaymentMethod) ? (v as CartPaymentMethod) : "cash";
}

const STORAGE_PREFIX = "pos-held-sales:";

export type HeldSale = {
  id: string;
  businessId: string;
  lines: CartLine[];
  discountAmount: number;
  customerId: string | null;
  paymentMethod: CartPaymentMethod;
  heldAt: number;
};

function storageKey(businessId: string) {
  return STORAGE_PREFIX + businessId;
}

function readStoredQueue(businessId: string): HeldSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(businessId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: HeldSale[] = [];
    for (const x of parsed) {
      if (
        x == null ||
        typeof x !== "object" ||
        typeof (x as HeldSale).id !== "string" ||
        typeof (x as HeldSale).businessId !== "string" ||
        !Array.isArray((x as HeldSale).lines) ||
        typeof (x as HeldSale).heldAt !== "number"
      ) {
        continue;
      }
      const h = x as HeldSale & { discountAmount?: unknown; customerId?: unknown };
      out.push({
        ...h,
        businessId: h.businessId === businessId ? h.businessId : businessId,
        discountAmount: typeof h.discountAmount === "number" ? h.discountAmount : 0,
        customerId: typeof h.customerId === "string" ? h.customerId : null,
        paymentMethod: parsePaymentMethod((h as { paymentMethod?: unknown }).paymentMethod),
      });
      if (out.length >= MAX_HELD) break;
    }
    return out;
  } catch {
    return [];
  }
}

function writeStoredQueue(businessId: string, queue: HeldSale[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify(queue));
  } catch {
    /* quota / private mode */
  }
}

type HoldResult = { ok: true } | { ok: false; error: string };
type ResumeResult = HoldResult;

type PosHeldSalesState = {
  /** Active business for queue scope; queue is always for this id */
  businessId: string | null;
  queue: HeldSale[];
  /** Call when current business changes (loads persisted queue for that business). */
  setBusinessContext: (businessId: string | null) => void;
  holdCurrentSale: () => HoldResult;
  resumeSale: (heldId: string) => ResumeResult;
  removeHeld: (heldId: string) => void;
};

export const usePosHeldSalesStore = create<PosHeldSalesState>((set, get) => ({
  businessId: null,
  queue: [],

  setBusinessContext: (businessId) => {
    if (!businessId) {
      set({ businessId: null, queue: [] });
      return;
    }
    // Same business only: queue is reloaded from disk per businessId (not merged across businesses).
    const queue = readStoredQueue(businessId).filter((h) => h.businessId === businessId);
    set({ businessId, queue });
  },

  holdCurrentSale: () => {
    const bid = get().businessId;
    if (!bid) return { ok: false, error: "No business selected." };

    if (get().queue.length >= MAX_HELD) {
      return {
        ok: false,
        error: `Queue is full (${MAX_HELD} max). Resume or delete a held sale first.`,
      };
    }

    const cart = useCartStore.getState();
    if (!cart.lines.length) return { ok: false, error: "Cart is empty." };

    const session = usePosSessionStore.getState();
    const held: HeldSale = {
      id: crypto.randomUUID(),
      businessId: bid,
      lines: cart.lines.map((l) => ({ ...l })),
      discountAmount: cart.discountAmount,
      customerId: session.selectedCustomerId,
      paymentMethod: session.paymentMethod,
      heldAt: Date.now(),
    };

    const next = [...get().queue, held];
    set({ queue: next });
    writeStoredQueue(bid, next);

    useCartStore.getState().clear();
    session.setSelectedCustomerId(null);

    return { ok: true };
  },

  resumeSale: (heldId) => {
    const bid = get().businessId;
    if (!bid) return { ok: false, error: "No business selected." };

    // v1: require empty active cart so we never silently overwrite in-progress work.
    const cart = useCartStore.getState();
    if (cart.lines.length > 0) {
      return {
        ok: false,
        error: "Clear or hold the current cart before resuming a held sale.",
      };
    }

    const held = get().queue.find((h) => h.id === heldId && h.businessId === bid);
    if (!held) return { ok: false, error: "Held sale not found." };

    useCartStore.setState({
      lines: held.lines.map((l) => ({ ...l })),
      discountAmount: held.discountAmount,
    });

    const session = usePosSessionStore.getState();
    session.setSelectedCustomerId(held.customerId);
    session.setPaymentMethod(held.paymentMethod);

    const next = get().queue.filter((h) => h.id !== heldId);
    set({ queue: next });
    writeStoredQueue(bid, next);

    return { ok: true };
  },

  removeHeld: (heldId) => {
    const bid = get().businessId;
    if (!bid) return;
    const next = get().queue.filter((h) => h.id !== heldId);
    set({ queue: next });
    writeStoredQueue(bid, next);
  },
}));
