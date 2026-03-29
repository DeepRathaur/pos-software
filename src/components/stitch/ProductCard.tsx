import { cn } from "@/lib/cn";

export function ProductCard({
  name,
  priceLabel,
  imageUrl,
  kindHint,
  onClick,
}: {
  name: string;
  priceLabel: string;
  imageUrl?: string | null;
  kindHint?: string;
  /** Omit for display-only tiles */
  onClick?: () => void;
}) {
  const cls =
    "group relative flex flex-col overflow-hidden rounded-xl border border-stitch-border bg-stitch-card text-left transition hover:border-stitch-primary/60";
  const inner = (
    <>
      <div
        className={cn(
          "aspect-square w-full bg-gradient-to-br from-stitch-surface to-stitch-bg",
          imageUrl && "bg-cover bg-center"
        )}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      />
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold text-stitch-fg">{name}</p>
        {kindHint ? <p className="text-[10px] uppercase text-stitch-fg-muted">{kindHint}</p> : null}
        <p className="mt-1 text-base font-bold text-stitch-primary">{priceLabel}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} active:scale-[0.99]`}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}
