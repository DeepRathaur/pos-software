"use client";

import { KpiCards } from "@/components/dashboard/KpiCards";
import { useAdvancedReportsQuery, type AdvancedReportsResponse } from "@/hooks/queries";

function money(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : "—";
}

export function AdvancedReports({
  businessId,
  enabled,
}: {
  businessId: string | null;
  enabled: boolean;
}) {
  const q = useAdvancedReportsQuery(businessId, enabled);
  const d = q.data;

  if (!businessId || !enabled) return null;

  if (q.isLoading) {
    return <p className="text-sm text-stitch-fg-muted">Loading advanced analytics…</p>;
  }

  if (q.isError || !d) {
    return <p className="text-sm text-rose-400">Could not load advanced reports.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-stitch-fg">Advanced analytics</h2>
      <SalesStrip sales={d.sales} />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
          <h3 className="text-sm font-medium text-stitch-fg-muted">Top products (30d)</h3>
          <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
            {d.top_products.length === 0 ? (
              <li className="text-stitch-fg-muted">No data</li>
            ) : (
              d.top_products.slice(0, 8).map((r) => (
                <li key={r.item_id} className="flex justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-stitch-fg-muted">{money(r.revenue)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
          <h3 className="text-sm font-medium text-stitch-fg-muted">Low stock</h3>
          <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
            {d.low_stock.length === 0 ? (
              <li className="text-stitch-fg-muted">None flagged</li>
            ) : (
              d.low_stock.slice(0, 8).map((r) => (
                <li key={r.item_id} className="flex justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-amber-300/90">{Number(r.quantity).toFixed(0)} left</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
      <section className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
        <h3 className="text-sm font-medium text-stitch-fg-muted">Staff revenue & commission (est.)</h3>
        <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
          {d.staff.length === 0 ? (
            <li className="text-stitch-fg-muted">No staff</li>
          ) : (
            d.staff.slice(0, 10).map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-stitch-fg-muted">#{i + 1}</span> {s.name}
                </span>
                <span className="text-stitch-fg-muted">
                  {money(s.revenue)} · est. comm. {money(String(s.commission_estimate))}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
          <h3 className="text-sm font-medium text-stitch-fg-muted">Top customers</h3>
          <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
            {d.top_customers.slice(0, 8).map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 text-stitch-fg-muted">{money(c.spend)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
          <h3 className="text-sm font-medium text-stitch-fg-muted">Repeat customers</h3>
          <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
            {d.repeat_customers.length === 0 ? (
              <li className="text-stitch-fg-muted">None yet</li>
            ) : (
              d.repeat_customers.slice(0, 8).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-stitch-fg-muted">{c.order_count} orders</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
      <section className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
        <h3 className="text-sm font-medium text-stitch-fg-muted">Purchase outstanding</h3>
        <ul className="mt-2 space-y-1 text-sm text-stitch-fg-secondary">
          {d.purchase_outstanding.length === 0 ? (
            <li className="text-stitch-fg-muted">No balances</li>
          ) : (
            d.purchase_outstanding.slice(0, 10).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <span className="text-stitch-fg-muted">{p.supplier_name ?? "Supplier"}</span>
                <span className="text-amber-300/90">{money(p.balance_due)} due</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function SalesStrip({ sales }: { sales: AdvancedReportsResponse["sales"] }) {
  return (
    <KpiCards
      items={[
        { label: "Sales today", value: money(sales.today.revenue) },
        { label: "Orders today", value: String(sales.today.orders) },
        { label: "Week revenue", value: money(sales.week.revenue) },
        { label: "Month revenue", value: money(sales.month.revenue) },
      ]}
    />
  );
}
