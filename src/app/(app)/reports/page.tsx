"use client";

import { KpiCards } from "@/components/dashboard/KpiCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { useReportSummary, useSalesByDay } from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";

export default function ReportsPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const summary = useReportSummary(businessId);
  const series = useSalesByDay(businessId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Reports</h1>
        <p className="text-sm text-zinc-500">Sales pulse and risk signals.</p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : (
        <>
          <KpiCards
            items={[
              {
                label: "Revenue",
                value: summary.data
                  ? `₹${Number(summary.data.summary.revenue).toFixed(2)}`
                  : "—",
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
          <SalesChart data={series.data?.series ?? []} />
        </>
      )}
    </div>
  );
}
