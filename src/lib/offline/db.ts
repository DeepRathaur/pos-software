import initSqlJs, { type Database } from "sql.js";
import { loadSqliteFromIndexedDB, saveSqliteToIndexedDB } from "@/lib/offline/idb";
import { SYNC_QUEUE_DDL } from "@/lib/offline/schema";

let dbPromise: Promise<Database> | null = null;

/**
 * Singleton SQLite (sql.js) database persisted to IndexedDB.
 * Only call from the browser (client components / effects).
 */
export async function getOfflineDb(): Promise<Database> {
  if (typeof window === "undefined") {
    throw new Error("Offline DB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });
      const bytes = await loadSqliteFromIndexedDB();
      const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
      db.exec(SYNC_QUEUE_DDL);
      return db;
    })();
  }
  return dbPromise;
}

/** Export DB to IndexedDB after mutations. */
export async function persistOfflineDb(): Promise<void> {
  const db = await getOfflineDb();
  const data = db.export();
  await saveSqliteToIndexedDB(data);
}

/** For tests / dev: reset singleton (does not delete IndexedDB). */
export function resetOfflineDbSingleton() {
  dbPromise = null;
}
