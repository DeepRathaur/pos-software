"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAppointmentsQuery,
  useCustomersQuery,
  useItemsQuery,
  useStaffQuery,
  type AppointmentRow,
} from "@/hooks/queries";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function AppointmentCalendar({ businessId }: { businessId: string }) {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const fromIso = weekStart.toISOString();
  const toIso = addDays(weekStart, 7).toISOString();

  const q = useAppointmentsQuery(businessId, fromIso, toIso);
  const staff = useStaffQuery(businessId);
  const customers = useCustomersQuery(businessId);
  const services = useItemsQuery(businessId, "service");

  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of q.data ?? []) {
      const day = a.start_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(a);
    }
    return map;
  }, [q.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!serviceId) throw new Error("Choose a service");
      if (!startLocal) throw new Error("Choose start time");
      const start = new Date(startLocal);
      if (Number.isNaN(start.getTime())) throw new Error("Invalid start time");
      const end = new Date(start.getTime() + durationMin * 60_000);
      return apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          businessId,
          customerId: customerId || null,
          staffId: staffId || null,
          serviceId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          notes: notes.trim() || null,
        }),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setNotes("");
      setFormErr(null);
    },
    onError: (e: unknown) =>
      setFormErr(e instanceof Error ? e.message : "Could not create appointment"),
  });

  const patch = useMutation({
    mutationFn: async (body: { id: string; status: string }) => {
      return apiFetch(`/api/appointments/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ businessId, status: body.status }),
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) out.push(addDays(weekStart, i));
    return out;
  }, [weekStart]);

  const serviceItems = (services.data as { id: string; name: string; kind: string }[] | undefined)?.filter(
    (i) => i.kind === "service"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-stitch-fg-secondary"
        >
          ← Week
        </button>
        <span className="text-sm text-stitch-fg-muted">
          {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} —{" "}
          {addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-stitch-fg-secondary"
        >
          Week →
        </button>
      </div>

      <form
        className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFormErr(null);
          create.mutate();
        }}
      >
        <h2 className="text-sm font-semibold text-stitch-fg-secondary">New appointment</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-stitch-fg-muted">
            Service
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
              required
            >
              <option value="">—</option>
              {(serviceItems ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stitch-fg-muted">
            Staff
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
            >
              <option value="">—</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stitch-fg-muted">
            Customer
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
            >
              <option value="">Walk-in</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stitch-fg-muted">
            Start
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
              required
            />
          </label>
          <label className="text-xs text-stitch-fg-muted">
            Duration (min)
            <input
              type="number"
              min={15}
              step={10}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
            />
          </label>
        </div>
        <label className="block text-xs text-stitch-fg-muted">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-stitch-fg"
          />
        </label>
        {formErr ? <p className="text-sm text-rose-400">{formErr}</p> : null}
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Book
        </button>
      </form>

      {q.isLoading ? (
        <p className="text-sm text-stitch-fg-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const list = grouped.get(key) ?? [];
            return (
              <section key={key}>
                <h3 className="mb-2 text-sm font-medium text-stitch-fg-muted">
                  {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </h3>
                {list.length === 0 ? (
                  <p className="text-xs text-stitch-fg-muted">No bookings</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="text-stitch-fg-secondary">
                            {new Date(a.start_at).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="ml-2 text-stitch-fg-muted">{a.service_name ?? "Service"}</span>
                          {a.customer_name ? (
                            <span className="ml-2 text-stitch-fg-muted">· {a.customer_name}</span>
                          ) : null}
                          {a.staff_name ? (
                            <span className="ml-2 text-stitch-fg-muted">· {a.staff_name}</span>
                          ) : null}
                          {a.order_id ? (
                            <span className="ml-2 text-xs text-emerald-500">Billed</span>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          {a.status !== "completed" && a.status !== "cancelled" ? (
                            <>
                              <button
                                type="button"
                                className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-stitch-fg-secondary"
                                disabled={patch.isPending}
                                onClick={() => patch.mutate({ id: a.id, status: "completed" })}
                              >
                                Mark done
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-stitch-fg-muted"
                                disabled={patch.isPending}
                                onClick={() => patch.mutate({ id: a.id, status: "cancelled" })}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-xs uppercase text-stitch-fg-muted">{a.status}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
