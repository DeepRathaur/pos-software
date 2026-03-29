"use client";

import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stitch-fg-muted"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-none bg-stitch-surface py-3 pl-10 pr-4 text-sm text-stitch-fg placeholder:text-stitch-fg-muted focus:ring-2 focus:ring-stitch-primary"
        type="search"
        autoComplete="off"
      />
    </div>
  );
}
