import { persistOfflineDb, getOfflineDb } from "@/lib/offline/db";
import type { OfflineOrderCheckoutPayload } from "@/lib/offline/types";

export type SaveOrderOfflineInput = {
  /** Same JSON body you would POST to `/api/orders` */
  checkoutBody: Record<string, unknown>;
};

/**
 * Persist a checkout as a row in `sync_queue` + SQLite file to IndexedDB.
 * Use when `navigator.onLine === false` or when you want explicit offline capture.
 */
export async function saveOrderOffline(input: SaveOrderOfflineInput): Promise<{
  queueId: number;
  clientMutationId: string;
}> {
  const now = new Date().toISOString();
  const clientMutationId = crypto.randomUUID();

  const envelope: OfflineOrderCheckoutPayload = {
    kind: "order_checkout",
    clientMutationId,
    updatedAt: now,
    body: input.checkoutBody,
  };

  const db = await getOfflineDb();
  db.run(
    `INSERT INTO sync_queue (table_name, operation, payload, status, created_at, updated_at, retry_count)
     VALUES (?, ?, ?, 'pending', ?, ?, 0)`,
    ["orders", "upsert", JSON.stringify(envelope), now, now]
  );

  const res = db.exec("SELECT last_insert_rowid() AS id");
  const queueId = Number(res[0]?.values[0]?.[0] ?? 0);
  if (!queueId) {
    throw new Error("Failed to read sync_queue insert id");
  }

  await persistOfflineDb();
  return { queueId, clientMutationId };
}

/** Generic queue row (sync handler may need extending for non-order payloads). */
export async function enqueueOfflineRow(input: {
  tableName: string;
  operation: "INSERT" | "UPDATE";
  payload: Record<string, unknown>;
}) {
  const db = await getOfflineDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO sync_queue (table_name, operation, payload, status, created_at, updated_at, retry_count)
     VALUES (?, ?, ?, 'pending', ?, ?, 0)`,
    [input.tableName, input.operation, JSON.stringify(input.payload), now, now]
  );
  await persistOfflineDb();
  return { ok: true as const };
}
