"use client";

import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { Screen, StitchHeader } from "@/components/stitch";
import { ModuleFallback } from "@/components/modules/ModuleFallback";
import { isModuleEnabled } from "@/lib/feature-modules";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { useBusinessStore } from "@/stores/business-store";

export default function AppointmentsPage() {
  const { modules } = useEnabledModules();
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  if (!isModuleEnabled(modules, "appointments")) {
    return (
      <ModuleFallback
        title="Appointments unavailable"
        description="Booking is not enabled for this business profile."
      />
    );
  }
  return (
    <Screen>
      <StitchHeader
        title="Appointments"
        subtitle="Schedule & daily bookings"
        icon="calendar_today"
      />
      {!businessId ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Choose a business in <strong>Setup</strong>.
        </div>
      ) : (
        <AppointmentCalendar businessId={businessId} />
      )}
    </Screen>
  );
}
