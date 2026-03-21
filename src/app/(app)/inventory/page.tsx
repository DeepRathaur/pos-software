"use client";

import { useInventoryQuery } from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";
import { hasModule } from "@/lib/modules-client";

export default function InventoryPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canInv = current ? hasModule(current.enabled_modules, "inventory") : false;

  const { data, isLoading } = useInventoryQuery(businessId);

  const rows =
    (data as { id: string; item_name: string; quantity: string; reorder_level: string }[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Inventory</h1>
        <p className="text-sm text-zinc-500">
          Stock levels are updated only via inventory transactions (sales, purchases, adjustments).
        </p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canInv ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          Inventory module is off for this profile (e.g. pure services).
        </div>
      ) : null}

      {businessId && canInv ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">
            On hand
          </div>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium text-zinc-100">{r.item_name}</span>
                  <span className="tabular-nums text-zinc-200">{Number(r.quantity).toFixed(2)}</span>
                  <span className="text-xs text-zinc-500">reorder {Number(r.reorder_level).toFixed(0)}</span>
                </li>
              ))}
              {rows.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-zinc-500">
                  No inventory rows — create items and stock records via API or future intake flow.
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
