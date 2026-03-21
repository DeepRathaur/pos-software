"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateBiz = useBusinessStore((s) => s.hydrate);
  useEffect(() => {
    hydrateAuth();
    hydrateBiz();
  }, [hydrateAuth, hydrateBiz]);
  return <>{children}</>;
}
