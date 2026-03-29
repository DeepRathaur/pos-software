"use client";

import { TableGrid } from "@/components/tables/TableGrid";
import { Screen, StitchHeader } from "@/components/stitch";
import { ModuleFallback } from "@/components/modules/ModuleFallback";
import { isModuleEnabled } from "@/lib/feature-modules";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { useBusinessStore } from "@/stores/business-store";

export default function TablesPage() {
  const { modules } = useEnabledModules();
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  if (!isModuleEnabled(modules, "tables")) {
    return (
      <ModuleFallback
        title="Tables unavailable"
        description="Floor plan / table service is not enabled for this business profile."
      />
    );
  }
  return (
    <Screen>
      <StitchHeader
        title="Table management"
        subtitle="List view — open POS for a tab"
        icon="table_restaurant"
      />
      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Choose a business in <strong>Setup</strong>.
        </div>
      ) : (
        <TableGrid businessId={businessId} />
      )}
    </Screen>
  );
}
