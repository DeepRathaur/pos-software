"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getVisibleNavItems } from "@/lib/nav-modules";
import { useBusinessStore } from "@/stores/business-store";
import { stitchNavIcon } from "@/components/stitch/nav-icons";
import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const pathname = usePathname();
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);

  const links = useMemo(
    () => getVisibleNavItems(current?.enabled_modules),
    [current?.enabled_modules]
  );

  return (
    <nav
      className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-stitch-border bg-stitch-bg/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-2 py-2">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          const icon = stitchNavIcon(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors",
                active
                  ? "text-stitch-primary"
                  : "text-stitch-fg-muted hover:text-stitch-fg-secondary"
              )}
            >
              <Icon name={icon} filled={active} className={cn(active && "text-stitch-primary")} />
              <span className={cn("leading-none", active && "font-bold")}>{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
