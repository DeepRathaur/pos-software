import { Pool } from "pg";

const globalForPool = globalThis as unknown as { __posPool?: Pool };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url && !(globalThis as { __posDbWarned?: boolean }).__posDbWarned) {
    (globalThis as { __posDbWarned?: boolean }).__posDbWarned = true;
    console.warn("DATABASE_URL is not set — API routes that use the DB will fail.");
  }
  return new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool = globalForPool.__posPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.__posPool = pool;
}
