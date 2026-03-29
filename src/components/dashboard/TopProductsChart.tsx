"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Row = { name: string; revenue: number };

export function TopProductsChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-stitch-fg-muted">
        No sales in the last 30 days yet.
      </div>
    );
  }
  const chartData = data.map((r) => ({
    name: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
    fullName: r.name,
    revenue: r.revenue,
  }));
  return (
    <div className="h-72 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="mb-2 text-sm font-medium text-stitch-fg-secondary">Top products (30 days)</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            interval={0}
          />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
            formatter={(value) => [`₹${Number(value ?? 0).toFixed(2)}`, "Revenue"]}
            labelFormatter={(_label, payload) => {
              const row = payload?.[0]?.payload as { fullName?: string; name?: string } | undefined;
              return row?.fullName ?? row?.name ?? "";
            }}
          />
          <Bar dataKey="revenue" fill="#34d399" radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
