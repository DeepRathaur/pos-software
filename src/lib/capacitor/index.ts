/**
 * Optional Capacitor bridges — safe no-ops on web. Replace with @capacitor/* in a native shell.
 * @see docs/capacitor.md
 */

export async function scanBarcode(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  return null;
}

export async function pickProductImage(): Promise<string | null> {
  return null;
}

export async function notifyLowStock(_message: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("Low stock", { body: _message });
  }
}

export async function shareInvoice(_text: string, _title?: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ text: _text, title: _title });
  }
}

export async function printBluetooth(_data: Uint8Array): Promise<boolean> {
  void _data;
  return false;
}
