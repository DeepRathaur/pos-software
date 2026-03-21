/** Queued sync operations — maps to `sync_queue.operation` */
export type SyncOperation = "insert" | "update" | "delete" | "upsert";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

/** Payload envelope for last-write-wins (client timestamps) */
export type OfflinePayloadMeta = {
  /** Stable id for this logical write (e.g. order checkout attempt) */
  clientMutationId: string;
  /** ISO timestamp — compared with server `updated_at` on conflict */
  updatedAt: string;
};

export type OfflineOrderCheckoutPayload = OfflinePayloadMeta & {
  kind: "order_checkout";
  /** Same shape as POST /api/orders body */
  body: Record<string, unknown>;
};

export type SyncQueueRow = {
  id: number;
  table_name: string;
  operation: string;
  payload: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  retry_count: number;
};

export type SyncPendingResult = {
  attempted: number;
  synced: number;
  failed: number;
  errors: { queueId: number; message: string }[];
};
