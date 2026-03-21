"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isRouteAllowedForModules } from "@/lib/nav-modules";
import { useBusinessStore } from "@/stores/business-store";

/**
 * Redirects away from routes that are not enabled for the current business module set.
 * When no business is selected, only `/dashboard` and `/settings` are allowed.
 */
export function ModuleRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const modules = current?.enabled_modules;

  useLayoutEffect(() => {
    const base = pathname.split("?")[0] ?? pathname;
    if (!businessId) {
      if (base !== "/dashboard" && base !== "/settings") {
        router.replace("/dashboard");
      }
      return;
    }
    if (!isRouteAllowedForModules(base, modules)) {
      router.replace("/dashboard");
    }
  }, [businessId, pathname, modules, router]);

  return <>{children}</>;
}
