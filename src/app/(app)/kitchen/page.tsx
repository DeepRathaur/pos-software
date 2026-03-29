"use client";

import { KitchenBoard } from "@/components/kitchen/KitchenBoard";
import { Screen, StitchHeader } from "@/components/stitch";
import { ModuleFallback } from "@/components/modules/ModuleFallback";
import { isKitchenOrdersEnabled } from "@/lib/feature-modules";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { useBusinessStore } from "@/stores/business-store";

export default function KitchenPage() {
  const { modules } = useEnabledModules();
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  if (!isKitchenOrdersEnabled(modules)) {
    return (
      <ModuleFallback
        title="Kitchen unavailable"
        description="Kitchen display is not enabled for this business profile."
      />
    );
  }
  return (
    <Screen>
      <StitchHeader title="Kitchen" subtitle="KOT queue — prep & handoff" icon="soup_kitchen" />
      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Choose a business in <strong>Setup</strong>.
        </div>
      ) : (
        <KitchenBoard businessId={businessId} />
      )}
    </Screen>
  );
}
