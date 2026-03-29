"use client";

import { useMemo, useState } from "react";
import { useCustomersQuery } from "@/hooks/queries";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { isModuleEnabled } from "@/lib/feature-modules";
import { Icon, ListRow, PillTabs, Screen, SearchField, StitchHeader } from "@/components/stitch";

export default function CustomersPage() {
  const { businessId, modules } = useEnabledModules();
  const canCustomers = isModuleEnabled(modules, "customers");
  const q = useCustomersQuery(businessId, canCustomers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    let r = rows;
    const s = search.trim().toLowerCase();
    if (s) r = r.filter((c) => c.name.toLowerCase().includes(s) || (c.phone ?? "").toLowerCase().includes(s));
    return r;
  }, [q.data, search]);

  if (!canCustomers) {
    return (
      <Screen>
        <StitchHeader title="Customers" icon="group" />
        <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 text-sm text-stitch-fg-muted">
          Customers module is not enabled.
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <StitchHeader
        title="Customers"
        subtitle="Directory & loyalty"
        icon="group"
        right={
          <button
            type="button"
            className="flex items-center justify-center rounded-lg bg-stitch-primary p-2.5 text-white shadow-lg shadow-stitch-primary/25"
            aria-label="Add customer"
          >
            <Icon name="person_add" />
          </button>
        }
      />

      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : (
        <>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone or email…"
            className="mb-4"
          />
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-stitch-border bg-stitch-card p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stitch-fg-muted">Total</p>
              <p className="text-lg font-bold text-stitch-fg">{(q.data ?? []).length}</p>
            </div>
            <div className="rounded-xl border border-stitch-border bg-stitch-card p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stitch-fg-muted">Active</p>
              <p className="text-lg font-bold text-stitch-primary">{filtered.length}</p>
            </div>
          </div>
          <PillTabs
            tabs={[
              { id: "all", label: "All customers" },
              { id: "recent", label: "Recent" },
              { id: "vip", label: "VIP" },
            ]}
            value={filter}
            onChange={setFilter}
            className="mb-4"
          />
          {q.isLoading ? (
            <p className="text-sm text-stitch-fg-muted">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((c) => (
                <li key={c.id}>
                  <ListRow
                    title={c.name}
                    subtitle={c.phone ?? "—"}
                    right={
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Active
                      </span>
                    }
                  />
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="py-8 text-center text-sm text-stitch-fg-muted">No customers yet.</li>
              ) : null}
            </ul>
          )}
        </>
      )}
    </Screen>
  );
}
