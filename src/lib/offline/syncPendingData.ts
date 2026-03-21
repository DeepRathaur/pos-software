import { apiFetch } from "@/lib/api-client";
import { persistOfflineDb, getOfflineDb } from "@/lib/offline/db";
import type { OfflineOrderCheckoutPayload, SyncPendingResult } from "@/lib/offline/types";

function parseLastWriteTimestamp(order: Record<string, unknown>): string | null {
  const u = order.updated_at ?? order.updatedAt;
  if (typeof u === "string") return u;
  if (u instanceof Date) return u.toISOString();
  return null;
}

/**
 * Push pending `sync_queue` rows to the API when online.
 * Conflict policy: **last write wins** — we send the client `updatedAt` in the envelope;
 * after a successful sync we stamp `updated_at` on the row from the server response when present.
 */
export async function syncPendingData(options: {
  token: string | null;
  /** Max rows per run */
  limit?: number;
}): Promise<SyncPendingResult> {
  if (typeof window === "undefined") {
    return { attempted: 0, synced: 0, failed: 0, errors: [] };
  }
  if (!navigator.onLine) {
    return { attempted: 0, synced: 0, failed: 0, errors: [] };
  }
  if (!options.token) {
    return { attempted: 0, synced: 0, failed: 0, errors: [] };
  }

  const limit = options.limit ?? 50;
  const db = await getOfflineDb();
  const stmt = db.prepare(
    `SELECT id, payload, retry_count FROM sync_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?`
  );
  stmt.bind([limit]);

  const rows: { id: number; payload: string; retry_count: number }[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as { id: number; payload: string; retry_count: number });
  }
  stmt.free();

  const result: SyncPendingResult = {
    attempted: rows.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    const now = new Date().toISOString();
    db.run(`UPDATE sync_queue SET status = 'syncing', updated_at = ? WHERE id = ?`, [now, row.id]);

    let envelope: OfflineOrderCheckoutPayload;
    try {
      envelope = JSON.parse(row.payload) as OfflineOrderCheckoutPayload;
    } catch {
      db.run(
        `UPDATE sync_queue SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
        ["Invalid payload JSON", now, row.id]
      );
      result.failed++;
      result.errors.push({ queueId: row.id, message: "Invalid payload JSON" });
      continue;
    }

    if (envelope.kind !== "order_checkout") {
      db.run(
        `UPDATE sync_queue SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
        ["Unsupported payload kind", now, row.id]
      );
      result.failed++;
      result.errors.push({ queueId: row.id, message: "Unsupported payload kind" });
      continue;
    }

    try {
      const res = await apiFetch<{ order: Record<string, unknown> }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(envelope.body),
        token: options.token,
      });

      const serverTs = parseLastWriteTimestamp(res.order);
      const mergedPayload: OfflineOrderCheckoutPayload = {
        ...envelope,
        updatedAt: serverTs ?? envelope.updatedAt,
        body: {
          ...envelope.body,
          _syncedOrderId: res.order.id,
          _serverUpdatedAt: serverTs,
        },
      };

      db.run(
        `UPDATE sync_queue SET status = 'synced', payload = ?, error_message = NULL, updated_at = ? WHERE id = ?`,
        [JSON.stringify(mergedPayload), mergedPayload.updatedAt, row.id]
      );
      result.synced++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      const rc = row.retry_count + 1;
      db.run(
        `UPDATE sync_queue SET status = 'failed', error_message = ?, retry_count = ?, updated_at = ? WHERE id = ?`,
        [msg, rc, now, row.id]
      );
      result.failed++;
      result.errors.push({ queueId: row.id, message: msg });
    }
  }

  await persistOfflineDb();
  return result;
}

/** Mark failed rows as pending again for another sync attempt. */
export async function requeueFailedSyncs(): Promise<void> {
  const db = await getOfflineDb();
  const now = new Date().toISOString();
  db.run(
    `UPDATE sync_queue SET status = 'pending', error_message = NULL, updated_at = ? WHERE status = 'failed'`,
    [now]
  );
  await persistOfflineDb();
}
