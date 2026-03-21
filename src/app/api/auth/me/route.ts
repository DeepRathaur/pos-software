import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const r = await pool.query(
      `SELECT id, email, name, created_at FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [session.sub]
    );
    if (r.rows.length === 0) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return jsonOk({ user: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}
