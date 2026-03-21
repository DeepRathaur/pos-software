"use client";

type Item = {
  id: string;
  name: string;
  price: string | number;
  tax_rate: string | number;
  kind: string;
};

export function ProductGrid({
  items,
  onAdd,
}: {
  items: Item[];
  onAdd: (item: Item) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onAdd(it)}
          className="flex min-h-[88px] flex-col items-start justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-emerald-600/60 active:scale-[0.99]"
        >
          <span className="line-clamp-2 text-sm font-medium text-zinc-100">{it.name}</span>
          <span className="text-xs text-zinc-500">{it.kind}</span>
          <span className="mt-2 text-lg font-semibold tabular-nums text-emerald-300">
            ₹{Number(it.price).toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}
