"use client";

import { cn } from "@/lib/cn";

export type PillTab = { id: string; label: string };

export function PillTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: PillTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-stitch-primary font-semibold text-white shadow-lg shadow-stitch-primary/25"
                : "bg-stitch-surface text-stitch-fg-muted hover:text-stitch-fg-secondary"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
