"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Row = { day: string; revenue: string; orders: number };

export function SalesChart({ data }: { data: Row[] }) {
  const chartData = data.map((r) => ({
    day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: Number(r.revenue),
    orders: r.orders,
  }));
  return (
    <div className="h-64 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="mb-2 text-sm font-medium text-zinc-300">Revenue (completed orders)</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12 }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="url(#fillRev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
