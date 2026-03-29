"use client";

export function PosSearchBar({
  value,
  onChange,
  placeholder = "Search products & services…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor="pos-search" className="sr-only">
        Search catalog
      </label>
      <input
        id="pos-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 py-3 pl-4 pr-10 text-base text-stitch-fg placeholder:text-stitch-fg-muted focus:border-emerald-600/50 focus:outline-none focus:ring-1 focus:ring-emerald-600/40"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stitch-fg-muted" aria-hidden>
        ⌕
      </span>
    </div>
  );
}
