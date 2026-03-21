"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

/** Flushes the offline SQLite sync queue when online (see `docs/offline-first-architecture.md`). */
export function OfflineSyncListener() {
  useOfflineSync(true);
  return null;
}
