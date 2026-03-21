"use client";

import { useState } from "react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { AdvancedReports } from "@/components/reports/AdvancedReports";
import { Icon, Screen, StitchHeader, UnderlineTabs } from "@/components/stitch";
import { useReportSummary, useSalesByDay } from "@/hooks/queries";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { isModuleEnabled } from "@/lib/feature-modules";
import { useBusinessStore } from "@/stores/business-store";

export default function ReportsPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const { modules } = useEnabledModules();
  const canReport = isModuleEnabled(modules, "reports");
  const summary = useReportSummary(businessId, canReport);
  const series = useSalesByDay(businessId, canReport);
  const [range, setRange] = useState("week");

  return (
    <Screen>
      <StitchHeader
        title="Reports & analytics"
        subtitle="Sales pulse and risk signals"
        icon="monitoring"
        right={
          <button type="button" className="rounded-lg p-2 text-slate-100" aria-label="Date range">
            <Icon name="calendar_today" />
          </button>
        }
      />

      <UnderlineTabs
        tabs={[
          { id: "day", label: "Day" },
          { id: "week", label: "Week" },
          { id: "month", label: "Month" },
          { id: "year", label: "Year" },
        ]}
        value={range}
        onChange={setRange}
      />

      {!businessId ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : (
        <>
          <div className="mt-6">
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
          </div>
          <div className="mt-3 rounded-xl border border-stitch-border bg-stitch-card/50 p-2">
            <SalesChart data={series.data?.series ?? []} />
          </div>
          <AdvancedReports businessId={businessId} enabled={canReport} />
        </>
      )}
    </Screen>
  );
}
