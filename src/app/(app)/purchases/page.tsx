"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { useItemsQuery } from "@/hooks/queries";
import { isModuleEnabled } from "@/lib/feature-modules";

type Supplier = { id: string; name: string };
type PurchaseRow = {
  id: string;
  total: string;
  created_at: string;
  supplier_name: string | null;
  status: string;
};

export default function PurchasesPage() {
  const token = useAuthStore((s) => s.token);
  const businessId = useBusinessStore((s) => s.currentBusinessId);
  const businesses = useBusinessStore((s) => s.businesses);
  const current = businesses.find((b) => b.id === businessId);
  const canPurch = current ? isModuleEnabled(current.enabled_modules, "purchases") : false;

  const qc = useQueryClient();
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", businessId, token],
    enabled: !!token && !!businessId && canPurch,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ suppliers: Supplier[] }>(`/api/suppliers?${qs}`, { token });
      return data.suppliers;
    },
  });
  const { data: items } = useItemsQuery(businessId, "product");
  const { data: purchases, refetch } = useQuery({
    queryKey: ["purchases", businessId, token],
    enabled: !!token && !!businessId && canPurch,
    queryFn: async () => {
      const qs = new URLSearchParams({ businessId: businessId! });
      const data = await apiFetch<{ purchases: PurchaseRow[] }>(`/api/purchases?${qs}`, { token });
      return data.purchases;
    },
  });

  const [supplierId, setSupplierId] = useState<string>("");
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const createPurchase = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("No business");
      return apiFetch<{ purchase: unknown }>("/api/purchases", {
        method: "POST",
        token,
        body: JSON.stringify({
          businessId,
          supplierId: supplierId || null,
          notes: notes.trim() || null,
          lines: [
            {
              itemId,
              quantity: Number(qty),
              unitCost: Number(unitCost),
            },
          ],
        }),
      });
    },
    onSuccess: async () => {
      setErr(null);
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["purchases"] });
      await qc.invalidateQueries({ queryKey: ["inventory"] });
      refetch();
    },
  });

  const rows = useMemo(() => purchases ?? [], [purchases]);
  const productRows = useMemo(
    () =>
      (items as { id: string; name: string; kind: string }[] | undefined)?.filter(
        (i) => i.kind === "product"
      ) ?? [],
    [items]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-stitch-fg">Stock-in</h1>
        <p className="text-sm text-stitch-fg-muted">
          Record purchases; inventory updates only via transactions (no direct stock edits).
        </p>
      </header>

      {!businessId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Select a business in <strong>Setup</strong>.
        </div>
      ) : null}

      {businessId && !canPurch ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-stitch-fg-muted">
          Purchases module is off for this profile.
        </div>
      ) : null}

      {businessId && canPurch ? (
        <form
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            if (!itemId) {
              setErr("Choose a product.");
              return;
            }
            createPurchase.mutate(undefined, {
              onError: (er) => setErr(er instanceof Error ? er.message : "Failed"),
            });
          }}
        >
          <h2 className="text-sm font-semibold text-stitch-fg-secondary">Record purchase</h2>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-stitch-fg-muted">
              Supplier (optional)
              <select
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">—</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-stitch-fg-muted">
              Product
              <select
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {productRows.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-stitch-fg-muted">
                Qty
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-stitch-fg-muted">
                Unit cost (₹)
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                  inputMode="decimal"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="text-sm text-stitch-fg-muted">
              Notes
              <input
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
          {err ? <p className="mt-2 text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            disabled={createPurchase.isPending}
            className="mt-4 w-full min-h-[48px] rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 disabled:opacity-40"
          >
            {createPurchase.isPending ? "Saving…" : "Receive & update stock"}
          </button>
        </form>
      ) : null}

      {businessId && canPurch ? (
        <section>
          <h2 className="text-sm font-semibold text-stitch-fg-secondary">Recent purchases</h2>
          <ul className="mt-2 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
            {rows.length === 0 ? (
              <li className="p-4 text-sm text-stitch-fg-muted">No purchases yet.</li>
            ) : (
              rows.slice(0, 30).map((p) => (
                <li key={p.id} className="flex justify-between gap-2 p-3 text-sm">
                  <span className="text-stitch-fg-secondary">
                    {new Date(p.created_at).toLocaleString()}{" "}
                    <span className="text-stitch-fg-muted">
                      {p.supplier_name ? `· ${p.supplier_name}` : ""}
                    </span>
                  </span>
                  <span className="tabular-nums text-emerald-300">₹{Number(p.total).toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
