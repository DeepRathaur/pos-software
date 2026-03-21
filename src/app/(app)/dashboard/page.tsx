"use client";

import Link from "next/link";
import { KpiCard, Screen, StitchHeader, StitchSalesChart, Icon } from "@/components/stitch";
import { useDashboardQuery } from "@/hooks/queries";
import { useBusinessStore } from "@/stores/business-store";
import { isModuleEnabled } from "@/lib/feature-modules";

export default function DashboardPage() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const showReports = current ? isModuleEnabled(current.enabled_modules, "reports") : false;

  const dash = useDashboardQuery(businessId, showReports);

  const rev7 = dash.data?.sales_last_7_days?.reduce((s, r) => s + Number(r.sales), 0) ?? 0;

  return (
    <div className="relative min-h-dvh">
      <Screen>
        <StitchHeader
          title="Dashboard"
          subtitle={current?.name ?? "Select a business in Setup"}
          icon="dashboard"
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-stitch-surface"
                aria-label="Notifications"
              >
                <Icon name="notifications" />
              </button>
              <div className="size-10 overflow-hidden rounded-full border-2 border-stitch-primary">
                <div className="flex h-full w-full items-center justify-center bg-stitch-surface text-stitch-primary">
                  <Icon name="person" />
                </div>
              </div>
            </div>
          }
        />

        {!businessId ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Create a business profile under <strong>Setup</strong> to unlock modules.
          </div>
        ) : null}

        {showReports && businessId ? (
          <>
            {dash.isLoading ? (
              <p className="text-sm text-slate-500">Loading analytics…</p>
            ) : dash.isError ? (
              <p className="text-sm text-rose-400">Could not load dashboard.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <KpiCard
                    label="Total revenue (today)"
                    value={`₹${Number(dash.data?.sales_today ?? 0).toFixed(2)}`}
                    icon="payments"
                    trend="+12.5%"
                    trendUp
                  />
                  <KpiCard
                    label="Orders (today)"
                    value={String(dash.data?.orders_today ?? 0)}
                    icon="group"
                    trend="+5.2%"
                    trendUp
                  />
                  <KpiCard
                    label="Profit (today)"
                    value={`₹${Number(dash.data?.profit ?? 0).toFixed(2)}`}
                    icon="ads_click"
                    trend="-2.1%"
                    trendUp={false}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-stitch-border bg-stitch-card/80 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-400">Sales trend</p>
                      <p className="text-4xl font-extrabold tracking-tight text-slate-100">
                        ₹{rev7.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-1 text-sm font-bold text-emerald-500">
                        +15.3%
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Last 7 days</p>
                    </div>
                  </div>
                  <StitchSalesChart />
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight text-slate-100">
                      Recent activity
                    </h3>
                    <Link href="/reports" className="text-sm font-semibold text-stitch-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  <p className="text-xs text-slate-500">
                    Low stock: {dash.data?.low_stock?.length ?? 0} SKU(s) need attention.
                  </p>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Reports are disabled for this business profile.</p>
        )}
      </Screen>

      <Link
        href="/pos"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-stitch-primary text-white shadow-lg shadow-stitch-primary/40 transition hover:scale-105"
        aria-label="New sale"
      >
        <Icon name="add" className="text-3xl text-white" />
      </Link>
    </div>
  );
}
