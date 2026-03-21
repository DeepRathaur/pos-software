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

type Row = {
  day: string;
  revenue?: string;
  sales?: string;
  orders: number;
};

export function SalesChart({ data, title = "Sales (completed orders)" }: { data: Row[]; title?: string }) {
  const chartData = data.map((r) => ({
    day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: Number(r.revenue ?? r.sales ?? 0),
    orders: r.orders,
  }));
  return (
    <div className="h-64 w-full rounded-2xl border border-stitch-border bg-stitch-card/50 p-3">
      <p className="mb-2 text-sm font-medium text-slate-300">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e21d48" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e21d48" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d161b" />
          <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#1a0d10", border: "1px solid #2d161b", borderRadius: 12 }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#e21d48" fill="url(#fillRev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
