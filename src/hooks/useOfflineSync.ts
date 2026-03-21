"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncPendingData } from "@/lib/offline/syncPendingData";
import { useAuthStore } from "@/stores/auth-store";

/**
 * When the app is online and the user is authenticated, periodically flush the offline sync queue.
 * Call from a client layout or the POS shell.
 */
export function useOfflineSync(enabled = true) {
  const token = useAuthStore((s) => s.token);
  const busy = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || !token || busy.current) return;
    busy.current = true;
    try {
      await syncPendingData({ token });
    } finally {
      busy.current = false;
    }
  }, [enabled, token]);

  useEffect(() => {
    if (!enabled || !token) return;
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => void flush(), 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [enabled, token, flush]);

  return { flush };
}
