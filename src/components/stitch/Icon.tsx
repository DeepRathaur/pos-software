import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Icon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  /** Filled icon (e.g. active tab) */
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined text-[22px] leading-none", className)}
      style={
        filled
          ? ({ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } as CSSProperties)
          : undefined
      }
      aria-hidden
    >
      {name}
    </span>
  );
}
