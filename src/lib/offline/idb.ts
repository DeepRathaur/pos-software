const IDB_NAME = "pos-offline-sqlite";
const STORE_NAME = "sqlite-db";
const DB_KEY = "export";

/** Load persisted SQLite file bytes from IndexedDB (null if missing). */
export function loadSqliteFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, "readonly");
      const get = tx.objectStore(STORE_NAME).get(DB_KEY);
      get.onerror = () => reject(get.error);
      get.onsuccess = () => resolve((get.result as Uint8Array | undefined) ?? null);
    };
  });
}

/** Persist SQLite export bytes to IndexedDB. */
export function saveSqliteToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const put = tx.objectStore(STORE_NAME).put(data, DB_KEY);
      put.onerror = () => reject(put.error);
      put.onsuccess = () => resolve();
    };
  });
}
