import type { SplitLine } from "@/components/pos/PaymentPanel";

function methodWord(m: SplitLine["method"]) {
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

export function formatPaymentSummary(
  split: boolean,
  paymentMethod: SplitLine["method"],
  splitLines: SplitLine[],
  totalRounded: number
): string {
  if (!split) {
    return `${methodWord(paymentMethod)} · ₹${totalRounded.toFixed(2)}`;
  }
  return splitLines
    .filter((l) => l.amount > 0)
    .map((l) => `${methodWord(l.method)} ₹${Number(l.amount.toFixed(2)).toFixed(2)}`)
    .join(" · ");
}
