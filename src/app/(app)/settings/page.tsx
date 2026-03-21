"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Screen, StitchHeader, ListRow } from "@/components/stitch";
import { useCreateBusinessMutation, useBusinessesQuery } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { getEnabledModules, type BusinessType } from "@/lib/feature-modules";

const types: { id: BusinessType; label: string }[] = [
  { id: "retail", label: "Retail" },
  { id: "cafe", label: "Café" },
  { id: "salon", label: "Salon" },
  { id: "restaurant", label: "Restaurant" },
  { id: "custom", label: "Custom" },
];

export default function SettingsPage() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const setCurrent = useBusinessStore((s) => s.setCurrent);
  const currentId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);

  useBusinessesQuery();

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
          <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-stitch-surface">
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
            <h2 className="text-lg font-bold text-slate-100">{user?.name ?? "User"}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 min-h-[48px] w-full rounded-xl border border-stitch-border text-sm font-medium text-slate-200"
          onClick={() => {
            clearAuth();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </section>

      <section className="mb-2">
        <h3 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Business operations
        </h3>
        <div className="divide-y divide-stitch-border overflow-hidden rounded-xl border border-stitch-border bg-stitch-card">
          <ListRow
            title="Business details"
            subtitle="Name, address, contact"
            right={<Icon name="chevron_right" className="text-slate-500" />}
          />
          <ListRow
            title="Payment methods"
            subtitle="Cards, wallets, cash"
            right={<Icon name="chevron_right" className="text-slate-500" />}
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <h2 className="text-sm font-semibold text-slate-200">Active business</h2>
        <select
          className="mt-3 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
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
                className="rounded-full bg-stitch-surface px-3 py-1 text-xs font-medium text-slate-200"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-xl border border-stitch-border bg-stitch-card p-4">
        <h2 className="text-sm font-semibold text-slate-200">New business</h2>
        <p className="mt-1 text-sm text-slate-500">Picking a type enables the right modules.</p>
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
          <label className="block text-sm text-slate-400">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-400">
            Business type
            <select
              className="mt-1 w-full rounded-xl border border-stitch-border bg-stitch-bg px-3 py-3 text-base text-slate-100"
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
          <div className="rounded-xl border border-stitch-border bg-stitch-bg/60 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">Modules enabled</p>
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Capacitor (native)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Barcode, camera, share, notifications — wire in native shell via{" "}
          <code className="text-stitch-primary">@/lib/capacitor</code>.
        </p>
      </section>
    </Screen>
  );
}
