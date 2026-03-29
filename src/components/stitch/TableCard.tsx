import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";

export function TableCard({
  label,
  status,
  occupied,
  onPress,
  selected,
}: {
  label: string;
  status: string;
  occupied: boolean;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 text-left shadow-sm transition",
        selected
          ? "border-stitch-primary bg-stitch-primary/10"
          : "border-stitch-border bg-stitch-card hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-stitch-fg">{label}</span>
        <Icon name="table_restaurant" className="text-stitch-primary" />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-2 w-2 rounded-full",
            occupied ? "bg-stitch-primary" : "bg-emerald-500"
          )}
        />
        <span className="text-xs font-medium uppercase tracking-wide text-stitch-fg-muted">
          {occupied ? "Occupied" : "Available"}
        </span>
      </div>
      <p className="text-2xl font-bold text-stitch-fg-secondary">{status}</p>
    </button>
  );
}
