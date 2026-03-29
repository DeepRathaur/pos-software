import { Pool } from "pg";

type GlobalWithPool = typeof globalThis & {
  __posPool?: Pool;
  __posPoolUrl?: string;
  __posDbWarned?: boolean;
};

const g = globalThis as GlobalWithPool;

function createPool(url: string | undefined): Pool {
  if (!url && !g.__posDbWarned) {
    g.__posDbWarned = true;
    console.warn("DATABASE_URL is not set — API routes that use the DB will fail.");
  }
  return new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

/** Recreates the pool when `DATABASE_URL` changes (e.g. after fixing .env.local without restarting dev). */
function getPool(): Pool {
  const url = process.env.DATABASE_URL ?? "";
  if (g.__posPool && g.__posPoolUrl === url) {
    return g.__posPool;
  }
  if (g.__posPool) {
    void g.__posPool.end();
    g.__posPool = undefined;
  }
  g.__posPool = createPool(url || undefined);
  g.__posPoolUrl = url;
  return g.__posPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const p = getPool();
    const v = Reflect.get(p, prop, p);
    if (typeof v === "function") {
      return (v as (...args: unknown[]) => unknown).bind(p);
    }
    return v;
  },
});
