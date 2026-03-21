type Kpi = { label: string; value: string; hint?: string };

export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{k.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{k.value}</p>
          {k.hint ? <p className="mt-1 text-xs text-zinc-500">{k.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
