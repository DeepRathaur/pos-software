"use client";

const methods = [
  { id: "cash" as const, label: "Cash" },
  { id: "upi" as const, label: "UPI" },
  { id: "card" as const, label: "Card" },
];

export function PaymentPanel({
  method,
  onMethod,
  onPay,
  disabled,
  busy,
}: {
  method: "cash" | "upi" | "card";
  onMethod: (m: "cash" | "upi" | "card") => void;
  onPay: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Payment</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMethod(m.id)}
            className={`min-h-[48px] rounded-xl border px-2 text-sm font-medium ${
              method === m.id
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                : "border-zinc-800 bg-zinc-950/40 text-zinc-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onPay}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 disabled:opacity-40"
      >
        {busy ? "Processing…" : "Charge & complete"}
      </button>
    </div>
  );
}
