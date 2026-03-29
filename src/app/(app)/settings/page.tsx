"use client";

import { useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Icon, Screen, StitchHeader, ListRow, StitchButton } from "@/components/stitch";
import { useCreateBusinessMutation, useBusinessesQuery, usePatchBusinessMutation } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { getEnabledModules, type BusinessType } from "@/lib/feature-modules";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

const types: { id: BusinessType; label: string }[] = [
  { id: "retail", label: "Retail" },
  { id: "cafe", label: "Café" },
  { id: "salon", label: "Salon" },
  { id: "restaurant", label: "Restaurant" },
  { id: "custom", label: "Custom" },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setCurrent = useBusinessStore((s) => s.setCurrent);
  const currentId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);

  useBusinessesQuery();

  const patchBiz = usePatchBusinessMutation();
  const [upiVpa, setUpiVpa] = useState("");

  useEffect(() => {
    const b = businesses.find((x) => x.id === currentId);
    const s = b?.settings as Record<string, unknown> | undefined;
    setUpiVpa(typeof s?.upiVpa === "string" ? s.upiVpa : "");
  }, [currentId, businesses]);

  const [name, setName] = useState("My Business");
  const [businessType, setBusinessType] = useState<BusinessType>("retail");
  const [err, setErr] = useState<string | null>(null);

  const createBiz = useCreateBusinessMutation();

  const previewMods = useMemo(() => getEnabledModules(businessType), [businessType]);

  return (
    <Screen>
      <StitchHeader
        title="Settings"
        subtitle="Business profile & session"
        icon="settings"
        right={
          <button type="button" className="rounded-full p-2 text-stitch-fg-muted hover:bg-stitch-surface">
            <Icon name="notifications" />
          </button>
        }
      />

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border-2 border-stitch-primary/30 bg-stitch-primary/10 text-stitch-primary">
            <Icon name="person" className="text-3xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-stitch-fg">{user?.name ?? "User"}</h2>
            <p className="text-sm text-stitch-fg-muted">{user?.email}</p>
          </div>
        </div>
        <div className="mt-4">
          <LogoutButton variant="full" />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <h2 className="text-sm font-semibold text-stitch-fg-secondary">Appearance</h2>
        <p className="mt-1 text-sm text-stitch-fg-muted">
          Light, dark, or match your device. Applies across the app and the Android WebView.
        </p>
        <div className="mt-3">
          <ThemeSwitcher />
        </div>
      </section>

      <section className="mb-2">
        <h3 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-stitch-fg-muted">
          Business operations
        </h3>
        <div className="divide-y divide-stitch-border overflow-hidden rounded-xl border border-stitch-border bg-stitch-card">
          <ListRow
            title="Business details"
            subtitle="Name, address, contact"
            right={<Icon name="chevron_right" className="text-stitch-fg-muted" />}
          />
          <ListRow
            title="Payment methods"
            subtitle="Cards, wallets, cash"
            right={<Icon name="chevron_right" className="text-stitch-fg-muted" />}
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <h2 className="text-sm font-semibold text-stitch-fg-secondary">Active business</h2>
        <select
          className="mt-3 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
          value={currentId ?? ""}
          onChange={(e) => setCurrent(e.target.value || null)}
        >
          <option value="" disabled>
            Select…
          </option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.business_type})
            </option>
          ))}
        </select>
        {currentId ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {(businesses.find((b) => b.id === currentId)?.enabled_modules ?? []).map((m) => (
              <span
                key={m}
                className="rounded-full bg-stitch-surface px-3 py-1 text-xs font-medium text-stitch-fg-secondary"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}

        {currentId ? (
          <div className="mt-4 border-t border-stitch-border pt-4">
            <label className="block text-sm text-stitch-fg-muted">
              UPI / VPA (for POS QR)
              <input
                className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
                placeholder="yourname@paytm"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="mt-1 text-xs text-stitch-fg-muted">
              Shown on the collect-payment step as a scannable UPI QR. You can also set{" "}
              <code className="text-stitch-primary">NEXT_PUBLIC_MERCHANT_UPI</code> in{" "}
              <code className="text-stitch-primary">.env.local</code>.
            </p>
            <StitchButton
              className="mt-3 w-full"
              disabled={patchBiz.isPending}
              onClick={() => {
                const b = businesses.find((x) => x.id === currentId);
                const prev = (b?.settings as Record<string, unknown> | undefined) ?? {};
                const trimmed = upiVpa.trim();
                const next = { ...prev };
                if (trimmed) next.upiVpa = trimmed;
                else delete next.upiVpa;
                patchBiz.mutate({ businessId: currentId, body: { settings: next } });
              }}
            >
              {patchBiz.isPending ? "Saving…" : "Save payment ID"}
            </StitchButton>
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <h2 className="text-sm font-semibold text-stitch-fg-secondary">New business</h2>
        <p className="mt-1 text-sm text-stitch-fg-muted">Picking a type enables the right modules.</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            createBiz.mutate(
              { name, businessType },
              {
                onSuccess: (data) => {
                  const id = data.business.id;
                  setCurrent(id);
                  setName("My Business");
                },
                onError: (er) => setErr(er instanceof Error ? er.message : "Failed"),
              }
            );
          }}
        >
          <label className="block text-sm text-stitch-fg-muted">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-stitch-fg-muted">
            Business type
            <select
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-stitch-fg"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-stitch-border bg-stitch-bg/60 p-3 text-xs text-stitch-fg-muted">
            <p className="font-medium text-stitch-fg-secondary">Modules enabled</p>
            <p className="mt-2">{previewMods.join(" · ")}</p>
          </div>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            disabled={createBiz.isPending}
            className="min-h-[52px] w-full rounded-2xl bg-stitch-primary text-base font-semibold text-white shadow-lg shadow-stitch-primary/25 disabled:opacity-40"
          >
            {createBiz.isPending ? "Creating…" : "Create business"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-dashed border-stitch-border bg-stitch-card/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stitch-fg-muted">Capacitor (native)</h3>
        <p className="mt-1 text-xs text-stitch-fg-muted">
          Barcode, camera, share, notifications — wire in native shell via{" "}
          <code className="text-stitch-primary">@/lib/capacitor</code>.
        </p>
      </section>
    </Screen>
  );
}
