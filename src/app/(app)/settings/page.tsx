"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBusinessMutation, useBusinessesQuery } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { modulesForBusinessType, type BusinessType } from "@/lib/feature-modules";

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

  const previewMods = useMemo(() => modulesForBusinessType(businessType), [businessType]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Setup</h1>
        <p className="text-sm text-zinc-500">Business profile, modules, and session.</p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Signed in</h2>
        <p className="mt-1 text-sm text-zinc-400">{user?.name}</p>
        <p className="text-sm text-zinc-500">{user?.email}</p>
        <button
          type="button"
          className="mt-4 min-h-[48px] w-full rounded-2xl border border-zinc-700 text-sm font-medium text-zinc-200"
          onClick={() => {
            clearAuth();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Active business</h2>
        <select
          className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
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
                className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200"
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">New business</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Picking a type enables the right modules automatically.
        </p>
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
          <label className="block text-sm text-zinc-400">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Business type
            <select
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Modules enabled</p>
            <p className="mt-2">{previewMods.join(" · ")}</p>
          </div>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            disabled={createBiz.isPending}
            className="min-h-[52px] w-full rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 disabled:opacity-40"
          >
            {createBiz.isPending ? "Creating…" : "Create business"}
          </button>
        </form>
      </section>
    </div>
  );
}
