"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useTablesQuery, type RestaurantTableRow } from "@/hooks/queries";

function statusLabel(t: RestaurantTableRow) {
  const st = String(t.status).toLowerCase();
  if (t.current_order_id) return "occupied";
  if (st === "free" || st === "available") return "available";
  return st;
}

export function TableGrid({ businessId }: { businessId: string }) {
  const token = useAuthStore((s) => s.token);
  const q = useTablesQuery(businessId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(() => {
    const tables = q.data ?? [];
    return tables.find((t) => t.id === selectedId) ?? null;
  }, [q.data, selectedId]);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const label = newLabel.trim();
    if (!label) return;
    setBusy("create");
    try {
      await apiFetch("/api/tables", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          label,
          capacity: 4,
          sortOrder: (q.data ?? []).length,
        }),
        token,
      });
      setNewLabel("");
      await q.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create table");
    } finally {
      setBusy(null);
    }
  }

  async function sendKitchen(orderId: string) {
    setErr(null);
    setBusy(`kot-${orderId}`);
    try {
      await apiFetch(`/api/orders/${orderId}/kitchen`, {
        method: "POST",
        body: JSON.stringify({ businessId }),
        token,
      });
      await q.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kitchen send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addTable} className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="min-w-[140px] flex-1">
          <label className="text-xs font-medium text-stitch-fg-muted">New table</label>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. T12)"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
          />
        </div>
        <button
          type="submit"
          disabled={busy === "create" || !newLabel.trim()}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {err ? (
        <p className="text-sm text-rose-400" role="alert">
          {err}
        </p>
      ) : null}

      {q.isLoading ? (
        <p className="text-sm text-stitch-fg-muted">Loading tables…</p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-stitch-fg-muted">No tables yet — add one above.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(q.data ?? []).map((t) => {
            const occ = statusLabel(t) === "occupied";
            const active = selectedId === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`flex w-full flex-col gap-1 rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-lg font-semibold text-stitch-fg">{t.label}</span>
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      occ ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {occ ? "Occupied" : "Available"}
                  </span>
                  {t.current_order_number ? (
                    <span className="text-xs text-stitch-fg-muted">#{t.current_order_number}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-semibold text-stitch-fg-secondary">Table {selected.label}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/pos?tableId=${selected.id}`}
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Open POS for this table
            </Link>
            {selected.current_order_id ? (
              <button
                type="button"
                disabled={busy === `kot-${selected.current_order_id}`}
                onClick={() => sendKitchen(selected.current_order_id!)}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-stitch-fg-secondary hover:bg-zinc-800 disabled:opacity-40"
              >
                Send to kitchen
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-stitch-fg-muted">
            Add items in POS, then pay — the tab opens on the table and completes in one step.
          </p>
        </div>
      ) : null}
    </div>
  );
}
