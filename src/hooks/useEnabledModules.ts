"use client";

import { useMemo } from "react";
import { useBusinessStore } from "@/stores/business-store";

/** Current business `enabled_modules` and `business_type` for conditional UI. */
export function useEnabledModules() {
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  return useMemo(() => {
    const b = businesses.find((x) => x.id === businessId);
    return {
      businessId,
      businessType: b?.business_type,
      modules: b?.enabled_modules ?? [],
    };
  }, [businessId, businesses]);
}
