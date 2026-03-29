"use client";

import { cn } from "@/lib/cn";

export type UnderlineTab = { id: string; label: string };

export function UnderlineTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: UnderlineTab[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-8 overflow-x-auto border-b border-stitch-border px-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-col items-center justify-center border-b-2 pb-3 pt-4 whitespace-nowrap transition-colors",
              active
                ? "border-stitch-primary font-bold text-stitch-primary"
                : "border-transparent text-stitch-fg-muted hover:text-stitch-fg-secondary"
            )}
          >
            <span className="text-sm tracking-wide">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
