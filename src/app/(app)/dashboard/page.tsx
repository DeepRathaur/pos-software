"use client";

import { KpiCards } from "@/components/dashboard/KpiCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { useReportSummary, useSalesByDay } from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";
import { hasModule } from "@/lib/modules-client";

export default function DashboardPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const summary = useReportSummary(businessId);
  const series = useSalesByDay(businessId);

  const showReports = current ? hasModule(current.enabled_modules, "reports") : true;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {current?.name ?? "Select a business in Settings"}
          {current ? (
            <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {current.business_type}
            </span>
          ) : null}
        </p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Create a business profile under <strong>Setup</strong> to unlock modules.
        </div>
      ) : null}

      {showReports && businessId ? (
        <>
          <KpiCards
            items={[
              {
                label: "Revenue",
                value: summary.data
                  ? `₹${Number(summary.data.summary.revenue).toFixed(2)}`
                  : "—",
                hint: "Completed orders",
              },
              {
                label: "Orders",
                value: summary.data ? String(summary.data.summary.completedOrders) : "—",
              },
              {
                label: "Customers",
                value: summary.data ? String(summary.data.summary.activeCustomers) : "—",
              },
            ]}
          />
          {summary.data?.lowStock?.length ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-medium">Low stock</p>
              <ul className="mt-2 space-y-1">
                {(summary.data.lowStock as { name: string; quantity: string }[]).slice(0, 5).map((r) => (
                  <li key={r.name} className="flex justify-between gap-2">
                    <span className="truncate">{r.name}</span>
                    <span className="tabular-nums text-rose-200">{r.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <SalesChart data={series.data?.series ?? []} />
        </>
      ) : (
        <p className="text-sm text-zinc-500">Reports are disabled for this business profile.</p>
      )}
    </div>
  );
}
