import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stitch-border bg-stitch-card/80 p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-stitch-fg-muted">{label}</p>
        <Icon name={icon} className="text-stitch-primary" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-stitch-fg">{value}</p>
      {trend ? (
        <p
          className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            trendUp === false ? "text-stitch-primary" : "text-emerald-500"
          )}
        >
          <Icon name={trendUp === false ? "trending_down" : "trending_up"} className="text-xs" />
          {trend}
        </p>
      ) : null}
    </div>
  );
}
