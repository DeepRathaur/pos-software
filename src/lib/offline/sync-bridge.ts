/**
 * Offline sync entry points (browser). Order checkout sync is implemented in `syncPendingData`.
 * Generic rows are persisted; extend `syncPendingData` to push them to APIs if needed.
 */

import { enqueueOfflineRow } from "@/lib/offline/saveOrderOffline";
import { syncPendingData } from "@/lib/offline/syncPendingData";

export async function saveOffline(data: {
  table_name: string;
  operation: "INSERT" | "UPDATE";
  payload: Record<string, unknown>;
}) {
  return enqueueOfflineRow({
    tableName: data.table_name,
    operation: data.operation,
    payload: data.payload,
  });
}

export async function syncWhenOnline(options: { token: string | null; limit?: number }) {
  return syncPendingData(options);
}
