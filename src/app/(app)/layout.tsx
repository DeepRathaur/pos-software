"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AppShell } from "@/components/layout/AppShell";
import { BusinessSync } from "@/components/providers/BusinessSync";
import { ModuleRouteGuard } from "@/components/providers/ModuleRouteGuard";
import { OfflineSyncListener } from "@/components/providers/OfflineSyncListener";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
  }, [hydrated, token, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">Loading…</div>
    );
  }
  if (!token) return null;

  return (
    <>
      <BusinessSync />
      <OfflineSyncListener />
      <ModuleRouteGuard>
        <AppShell>{children}</AppShell>
      </ModuleRouteGuard>
    </>
  );
}
