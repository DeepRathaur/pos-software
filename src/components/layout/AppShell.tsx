"use client";

import { BottomNav } from "@/components/stitch/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-stitch-bg text-stitch-fg">
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}

