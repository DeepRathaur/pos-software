/**
 * Build a UPI deep link for QR display (NPCI upi:// scheme).
 * @see https://www.npci.org.in/what-we-do/upi/product-overview
 */
export function buildUpiPayUrl(opts: {
  payeeAddress: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
}): string {
  const pa = opts.payeeAddress.trim();
  const pn = opts.payeeName.trim().slice(0, 50) || "Merchant";
  const am = opts.amount.toFixed(2);
  const params = new URLSearchParams({
    pa,
    pn,
    am,
    cu: "INR",
  });
  const tn = opts.transactionNote?.trim().slice(0, 80);
  if (tn) params.set("tn", tn);
  return `upi://pay?${params.toString()}`;
}

export function getMerchantUpiVpa(
  settings: Record<string, unknown> | undefined,
  envFallback?: string | null
): string | null {
  const fromSettings = settings?.upiVpa;
  if (typeof fromSettings === "string" && fromSettings.trim().length > 0) {
    return fromSettings.trim();
  }
  const env = envFallback?.trim() ?? process.env.NEXT_PUBLIC_MERCHANT_UPI?.trim();
  return env && env.length > 0 ? env : null;
}
