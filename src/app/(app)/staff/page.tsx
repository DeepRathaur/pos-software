"use client";

import { ModuleFallback } from "@/components/modules/ModuleFallback";
import { Icon, ListRow, Screen, StitchHeader } from "@/components/stitch";
import { useStaffQuery } from "@/hooks/queries";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { isModuleEnabled } from "@/lib/feature-modules";

export default function StaffPage() {
  const { businessId, modules } = useEnabledModules();
  const q = useStaffQuery(businessId);

  if (!isModuleEnabled(modules, "staff")) {
    return (
      <ModuleFallback
        title="Team unavailable"
        description="Staff management is not enabled for this business profile."
      />
    );
  }

  return (
    <Screen>
      <StitchHeader title="Staff" subtitle="Performance & scheduling" icon="groups" />

      {q.isLoading ? (
        <p className="text-sm text-stitch-fg-muted">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((s) => (
            <li key={s.id}>
              <ListRow
                title={s.name}
                subtitle={s.role}
                right={<Icon name="chevron_right" className="text-stitch-fg-muted" />}
              />
            </li>
          ))}
          {(q.data ?? []).length === 0 ? (
            <li className="py-8 text-center text-sm text-stitch-fg-muted">No staff yet.</li>
          ) : null}
        </ul>
      )}
    </Screen>
  );
}
