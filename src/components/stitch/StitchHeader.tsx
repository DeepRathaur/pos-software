import { cn } from "@/lib/cn";
import { Icon } from "@/components/stitch/Icon";

type Props = {
  title: string;
  subtitle?: string;
  /** Material icon name for left badge */
  icon?: string;
  /** Left slot (e.g. back) overrides icon */
  left?: React.ReactNode;
  right?: React.ReactNode;
  variant?: "border" | "plain";
};

export function StitchHeader({
  title,
  subtitle,
  icon = "dashboard",
  left,
  right,
  variant = "border",
}: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 bg-stitch-bg/95 py-4 backdrop-blur-md",
        variant === "border" && "border-b border-stitch-border"
      )}
    >
      {left ? (
        <div className="shrink-0">{left}</div>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stitch-primary/10 text-stitch-primary">
          <Icon name={icon} className="text-[18px]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-stitch-fg">{title}</h1>
        {subtitle ? <p className="text-xs text-stitch-fg-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </header>
  );
}
