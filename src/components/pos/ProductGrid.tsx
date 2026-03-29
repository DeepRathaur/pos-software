"use client";

type Item = {
  id: string;
  name: string;
  price: string | number;
  tax_rate: string | number;
  kind: string;
  image_url?: string | null;
};

export function ProductGrid({
  items,
  onAdd,
  emptyHint = "No matches — try another search.",
}: {
  items: Item[];
  onAdd: (item: Item) => void;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-stitch-fg-muted">
        {emptyHint}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onAdd(it)}
          className="flex min-h-[88px] flex-col items-start justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-emerald-600/60 active:scale-[0.99]"
        >
          {it.image_url ? (
            // Arbitrary user URLs — skip next/image domain allowlist
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.image_url}
              alt=""
              className="mb-2 h-14 w-full rounded-lg object-cover"
            />
          ) : null}
          <span className="line-clamp-2 text-sm font-medium text-stitch-fg">{it.name}</span>
          <span className="text-xs text-stitch-fg-muted">{it.kind}</span>
          <span className="mt-2 text-lg font-semibold tabular-nums text-emerald-300">
            ₹{Number(it.price).toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}
