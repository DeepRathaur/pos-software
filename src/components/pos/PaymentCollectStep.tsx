"use client";

import dynamic from "next/dynamic";
import { buildUpiPayUrl, getMerchantUpiVpa } from "@/lib/upi";
import type { BusinessRow } from "@/stores/business-store";
import type { SplitLine } from "@/components/pos/PaymentPanel";

const QRCode = dynamic(() => import("react-qr-code").then((m) => m.default), { ssr: false });

function methodLabel(m: SplitLine["method"]) {
  switch (m) {
    case "cash":
      return "Cash";
    case "upi":
      return "UPI";
    case "card":
      return "Card";
    default:
      return "Other";
  }
}

export function PaymentCollectStep({
  business,
  totalRounded,
  split,
  paymentMethod,
  splitLines,
  onConfirmComplete,
  onBack,
  busy,
}: {
  business: BusinessRow | undefined;
  totalRounded: number;
  split: boolean;
  paymentMethod: "cash" | "upi" | "card" | "other";
  splitLines: SplitLine[];
  onConfirmComplete: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const vpa = getMerchantUpiVpa(business?.settings as Record<string, unknown> | undefined);

  const tenders: { method: SplitLine["method"]; amount: number }[] = split
    ? splitLines
        .filter((l) => l.amount > 0)
        .map((l) => ({ method: l.method, amount: Number(l.amount.toFixed(2)) }))
    : [{ method: paymentMethod, amount: totalRounded }];

  const upiParts = tenders.filter((t) => t.method === "upi");
  const needsUpiQr = upiParts.length > 0;
  const nonUpi = tenders.filter((t) => t.method !== "upi");

  const payeeName = business?.name ?? "Merchant";

  return (
    <div className="space-y-4">
      <p className="text-sm text-stitch-fg-muted">
        Ask the customer to pay, then confirm below to record the sale in the system.
      </p>

      {needsUpiQr ? (
        <div className="space-y-4">
          {!vpa ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              No UPI ID configured. Add <strong>UPI / VPA</strong> in Settings (or{" "}
              <code className="text-xs">NEXT_PUBLIC_MERCHANT_UPI</code> in env), or collect UPI
              outside the app and tap complete.
            </div>
          ) : null}
          {upiParts.map((t, idx) => {
            const url =
              vpa && t.amount > 0
                ? buildUpiPayUrl({
                    payeeAddress: vpa,
                    payeeName,
                    amount: t.amount,
                    transactionNote: `POS ${totalRounded.toFixed(2)}`,
                  })
                : "";
            return (
              <div
                key={`upi-${idx}`}
                className="flex flex-col items-center rounded-xl border border-stitch-border bg-stitch-card/60 p-4"
              >
                <p className="mb-2 text-sm font-semibold text-stitch-fg-secondary">
                  UPI — ₹{t.amount.toFixed(2)}
                </p>
                {url ? (
                  <div className="rounded-lg bg-white p-3">
                    <QRCode value={url} size={180} />
                  </div>
                ) : (
                  <p className="text-sm text-stitch-fg-muted">Configure UPI to show QR.</p>
                )}
                <p className="mt-2 max-w-[240px] break-all text-center text-[10px] text-stitch-fg-muted">
                  {url || "—"}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {nonUpi.length > 0 ? (
        <div className="rounded-xl border border-stitch-border bg-stitch-surface/80 p-3 text-sm text-stitch-fg-secondary">
          <p className="mb-2 font-medium text-stitch-fg-secondary">Collect tender</p>
          <ul className="space-y-1">
            {nonUpi.map((t, i) => (
              <li key={i} className="flex justify-between tabular-nums">
                <span>{methodLabel(t.method)}</span>
                <span>₹{t.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirmComplete}
          className="min-h-[48px] flex-1 rounded-2xl bg-stitch-primary text-base font-bold text-white shadow-lg shadow-stitch-primary/25 disabled:opacity-40"
        >
          {busy ? "Completing…" : "Confirm payment & complete sale"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="min-h-[48px] flex-1 rounded-2xl border border-stitch-border bg-stitch-bg text-sm font-semibold text-stitch-fg-secondary disabled:opacity-40"
        >
          Back
        </button>
      </div>
    </div>
  );
}
