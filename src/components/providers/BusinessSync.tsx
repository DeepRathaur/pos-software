"use client";

import { useEffect } from "react";
import { useBusinessesQuery } from "@/hooks/queries";
import { useBusinessStore, type BusinessRow } from "@/stores/business-store";

export function BusinessSync() {
  const { data } = useBusinessesQuery();
  const setBusinesses = useBusinessStore((s) => s.setBusinesses);
  useEffect(() => {
    if (data) setBusinesses(data as BusinessRow[]);
  }, [data, setBusinesses]);
  return null;
}
