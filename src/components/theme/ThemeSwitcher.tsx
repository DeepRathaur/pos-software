"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { StitchButton } from "@/components/stitch/StitchButton";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[52px] rounded-xl border border-stitch-border bg-stitch-surface/50 px-2 py-2">
        <span className="text-sm text-stitch-fg-muted">Theme…</span>
      </div>
    );
  }

  const active = theme ?? "dark";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {(
        [
          { id: "light" as const, label: "Light" },
          { id: "dark" as const, label: "Dark" },
          { id: "system" as const, label: "System" },
        ] as const
      ).map((opt) => (
        <StitchButton
          key={opt.id}
          type="button"
          variant={active === opt.id ? "primary" : "secondary"}
          className="min-h-[48px] flex-1"
          onClick={() => setTheme(opt.id)}
        >
          {opt.label}
          {opt.id === "system" && resolvedTheme ? (
            <span className="ml-1 text-xs opacity-80">({resolvedTheme})</span>
          ) : null}
        </StitchButton>
      ))}
    </div>
  );
}
