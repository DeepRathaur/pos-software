"use client";

import { useMemo, useState } from "react";
import { Icon, ListRow, Screen, SearchField, StitchHeader, UnderlineTabs } from "@/components/stitch";
import { useInventoryQuery } from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";
import { isModuleEnabled } from "@/lib/feature-modules";

export default function InventoryPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canInv = current ? isModuleEnabled(current.enabled_modules, "inventory") : false;

  const { data, isLoading } = useInventoryQuery(businessId);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows =
      (data as { id: string; item_name: string; quantity: string; reorder_level: string }[]) ?? [];
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => x.item_name.toLowerCase().includes(q));
    if (tab === "low") {
      r = r.filter((x) => Number(x.quantity) <= Number(x.reorder_level));
    }
    return r;
  }, [data, search, tab]);

  return (
    <Screen>
      <StitchHeader
        title="Inventory"
        subtitle="Stock levels & alerts"
        icon="warehouse"
        right={
          <button type="button" className="relative rounded-lg p-2 text-stitch-fg" aria-label="Notifications">
            <Icon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-stitch-primary" />
          </button>
        }
      />

      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canInv ? (
        <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-stitch-fg-muted">
          Inventory module is off for this profile.
        </div>
      ) : null}

      {businessId && canInv ? (
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Search stock items…" className="mb-4" />
          <UnderlineTabs
            tabs={[
              { id: "all", label: "All items" },
              { id: "low", label: "Low stock" },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "low" && filtered.length > 0 ? (
            <div className="mt-4 rounded-xl border border-stitch-primary/30 bg-stitch-primary/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-stitch-primary">
                <Icon name="error" />
                <h3 className="text-lg font-bold">Critical alerts</h3>
              </div>
              {filtered.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="mb-2 flex items-center justify-between rounded-lg border border-stitch-primary/30 p-3"
                >
                  <div>
                    <p className="font-bold text-stitch-fg">{r.item_name}</p>
                    <p className="text-sm text-stitch-primary">
                      {Number(r.quantity).toFixed(0)} left · reorder {Number(r.reorder_level).toFixed(0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-stitch-primary px-3 py-2 text-xs font-bold text-white"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {isLoading ? (
            <p className="mt-4 text-sm text-stitch-fg-muted">Loading…</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.map((r) => (
                <li key={r.id}>
                  <ListRow
                    title={r.item_name}
                    subtitle={`On hand ${Number(r.quantity).toFixed(2)} · reorder ${Number(r.reorder_level).toFixed(0)}`}
                    right={
                      <span className="text-sm font-bold tabular-nums text-stitch-fg">
                        {Number(r.quantity).toFixed(2)}
                      </span>
                    }
                  />
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="py-8 text-center text-sm text-stitch-fg-muted">No rows.</li>
              ) : null}
            </ul>
          )}
        </>
      ) : null}
    </Screen>
  );
}
