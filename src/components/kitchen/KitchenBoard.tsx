"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useKotQuery, type KotTicketRow } from "@/hooks/queries";

const steps = ["pending", "preparing", "ready"] as const;

function nextStatus(current: string): (typeof steps)[number] | null {
  const i = steps.indexOf(current as (typeof steps)[number]);
  if (i < 0 || i >= steps.length - 1) return null;
  return steps[i + 1];
}

export function KitchenBoard({ businessId }: { businessId: string }) {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const q = useKotQuery(businessId);

  const patch = useMutation({
    mutationFn: async (body: { id: string; status: (typeof steps)[number] }) => {
      return apiFetch(`/api/kot/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ businessId, status: body.status }),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kot", businessId] });
    },
  });

  const tickets = q.data ?? [];

  const pending = tickets.filter((t) => t.status !== "ready");
  const done = tickets.filter((t) => t.status === "ready");

  return (
    <div className="space-y-6">
      {q.isLoading ? (
        <p className="text-sm text-stitch-fg-muted">Loading tickets…</p>
      ) : pending.length === 0 && done.length === 0 ? (
        <p className="text-sm text-stitch-fg-muted">
          No kitchen tickets — send orders from table service or POS.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-stitch-fg-muted">Active</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {pending.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  busy={patch.isPending}
                  onAdvance={(status) => patch.mutate({ id: t.id, status })}
                />
              ))}
            </ul>
          </section>
          {done.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-stitch-fg-muted">Ready</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {done.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    busy={patch.isPending}
                    onAdvance={(status) => patch.mutate({ id: t.id, status })}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  busy,
  onAdvance,
}: {
  ticket: KotTicketRow;
  busy: boolean;
  onAdvance: (status: (typeof steps)[number]) => void;
}) {
  const n = nextStatus(ticket.status);
  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-stitch-fg-muted">
            {ticket.table_label ? `Table ${ticket.table_label}` : "Takeaway"}
          </p>
          <p className="text-lg font-semibold text-stitch-fg">Order #{ticket.order_number ?? "—"}</p>
        </div>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium capitalize text-amber-200">
          {ticket.status}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-stitch-fg-secondary">
        {ticket.items.map((it, i) => (
          <li key={i}>
            {Number(it.quantity)}× {it.name}
          </li>
        ))}
      </ul>
      {n ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(n)}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Mark {n === "preparing" ? "preparing" : "ready"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-stitch-fg-muted">Ticket complete — runner can pick up.</p>
      )}
    </li>
  );
}
