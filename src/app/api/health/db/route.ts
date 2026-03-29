import { pool } from "@/infrastructure/database/pool";
import { handleRouteError, jsonOk } from "@/lib/http";

/**
 * GET /api/health/db — connectivity + minimal schema probe (no secrets in response).
 */
export async function GET() {
  try {
    await pool.query("SELECT 1 AS ok");
    const reg = await pool.query<{ reg: string | null }>(
      `SELECT to_regclass('public.users')::text AS reg`
    );
    const usersTable = reg.rows[0]?.reg ?? null;
    return jsonOk({
      ok: true,
      select1: true,
      usersTable: Boolean(usersTable),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
