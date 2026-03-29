import { cn } from "@/lib/cn";

export function ListRow({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const C = onClick ? "button" : "div";
  return (
    <C
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border border-stitch-border bg-stitch-card p-4 text-left transition hover:border-stitch-primary/40",
        onClick && "cursor-pointer"
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-stitch-fg">{title}</p>
        {subtitle ? <p className="text-xs text-stitch-fg-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </C>
  );
}
