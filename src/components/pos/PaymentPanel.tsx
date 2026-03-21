"use client";

import { useMemo } from "react";

const methods = [
  { id: "cash" as const, label: "Cash" },
  { id: "upi" as const, label: "UPI" },
  { id: "card" as const, label: "Card" },
  { id: "other" as const, label: "Other" },
];

export type SplitLine = { method: "cash" | "upi" | "card" | "other"; amount: number };

export function PaymentPanel({
  orderTotal,
  method,
  onMethod,
  split,
  onSplit,
  splitLines,
  onSplitLines,
  onPay,
  disabled,
  busy,
}: {
  orderTotal: number;
  method: "cash" | "upi" | "card" | "other";
  onMethod: (m: "cash" | "upi" | "card" | "other") => void;
  split: boolean;
  onSplit: (v: boolean) => void;
  splitLines: SplitLine[];
  onSplitLines: (lines: SplitLine[]) => void;
  onPay: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const splitSum = useMemo(
    () => Math.round(splitLines.reduce((s, l) => s + l.amount, 0) * 100) / 100,
    [splitLines]
  );
  const splitOk = split && splitSum + 1e-6 >= orderTotal;

  return (
    <div className="rounded-2xl border border-stitch-border bg-stitch-card/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Payment</h2>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={split}
            onChange={(e) => onSplit(e.target.checked)}
            className="rounded border-stitch-border"
          />
          Split payment
        </label>
      </div>

      {!split ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onMethod(m.id)}
              className={`min-h-[52px] rounded-xl border px-2 text-sm font-semibold ${
                method === m.id
                  ? "border-stitch-primary bg-stitch-primary/15 text-stitch-primary"
                  : "border-stitch-border bg-stitch-bg text-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {splitLines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <select
                value={line.method}
                onChange={(e) => {
                  const next = [...splitLines];
                  next[idx] = { ...line, method: e.target.value as SplitLine["method"] };
                  onSplitLines(next);
                }}
                className="min-h-[44px] flex-1 rounded-xl border border-stitch-border bg-stitch-bg px-2 text-sm text-slate-200"
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={line.amount || ""}
                onChange={(e) => {
                  const next = [...splitLines];
                  next[idx] = { ...line, amount: Number(e.target.value) || 0 };
                  onSplitLines(next);
                }}
                className="min-h-[44px] w-28 rounded-xl border border-stitch-border bg-stitch-bg px-2 text-sm tabular-nums text-slate-100"
                placeholder="Amount"
              />
              {splitLines.length > 1 ? (
                <button
                  type="button"
                  className="text-xs text-rose-400"
                  onClick={() => onSplitLines(splitLines.filter((_, j) => j !== idx))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-emerald-400"
            onClick={() => onSplitLines([...splitLines, { method: "cash", amount: 0 }])}
          >
            + Add tender
          </button>
          <p className="text-xs text-slate-500">
            Collected: <span className="tabular-nums text-slate-200">₹{splitSum.toFixed(2)}</span>
            {" · "}
            Need: <span className="tabular-nums text-slate-200">₹{orderTotal.toFixed(2)}</span>
            {!splitOk ? (
              <span className="text-amber-400"> — add enough to cover total</span>
            ) : null}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || busy || (split && !splitOk)}
        onClick={onPay}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-stitch-primary text-base font-bold text-white shadow-lg shadow-stitch-primary/25 disabled:opacity-40"
      >
        {busy ? "Processing…" : "Charge & complete"}
      </button>
    </div>
  );
}
