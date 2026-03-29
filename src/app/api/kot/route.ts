import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const r = await pool.query(
      `SELECT k.*,
              o.order_number,
              o.table_id,
              rt.label AS table_label,
              o.kitchen_status AS order_kitchen_status
       FROM kot k
       INNER JOIN orders o ON o.id = k.order_id AND o.deleted_at IS NULL
       LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
       WHERE k.business_id = $1
       ORDER BY k.created_at ASC`,
      [businessId]
    );
    const tickets = [];
    for (const row of r.rows) {
      const items = await pool.query(
        `SELECT oi.quantity, oi.line_total, i.name, oi.kitchen_status AS line_kitchen_status
         FROM order_items oi
         JOIN items i ON i.id = oi.item_id
         WHERE oi.order_id = $1 AND oi.deleted_at IS NULL
         ORDER BY oi.created_at ASC`,
        [row.order_id]
      );
      tickets.push({ ...row, items: items.rows });
    }
    return jsonOk({ tickets });
  } catch (err) {
    return handleRouteError(err);
  }
}
