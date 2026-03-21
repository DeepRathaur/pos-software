import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
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
    const type = searchParams.get("type") ?? "summary";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (type === "summary") {
      const sales = await pool.query(
        `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*)::int AS orders
         FROM orders
         WHERE business_id = $1 AND deleted_at IS NULL AND status = 'completed'
           AND ($2::timestamptz IS NULL OR created_at >= $2)
           AND ($3::timestamptz IS NULL OR created_at < $3)`,
        [businessId, from ? new Date(from) : null, to ? new Date(to) : null]
      );
      const cust = await pool.query(
        `SELECT COUNT(*)::int AS customers FROM customers WHERE business_id = $1 AND deleted_at IS NULL`,
        [businessId]
      );
      const lowStock = await pool.query(
        `SELECT i.item_id, it.name, i.quantity, i.reorder_level
         FROM inventory i
         JOIN items it ON it.id = i.item_id
         WHERE i.business_id = $1 AND i.deleted_at IS NULL AND it.track_inventory = true
           AND i.quantity <= i.reorder_level
         ORDER BY i.quantity ASC
         LIMIT 20`,
        [businessId]
      );
      return jsonOk({
        summary: {
          revenue: sales.rows[0].revenue,
          completedOrders: sales.rows[0].orders,
          activeCustomers: cust.rows[0].customers,
        },
        lowStock: lowStock.rows,
      });
    }

    if (type === "sales-by-day") {
      const r = await pool.query(
        `SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day,
                COALESCE(SUM(total),0) AS revenue,
                COUNT(*)::int AS orders
         FROM orders
         WHERE business_id = $1 AND deleted_at IS NULL AND status = 'completed'
           AND ($2::timestamptz IS NULL OR created_at >= $2)
           AND ($3::timestamptz IS NULL OR created_at < $3)
         GROUP BY 1
         ORDER BY 1 ASC`,
        [businessId, from ? new Date(from) : null, to ? new Date(to) : null]
      );
      return jsonOk({ series: r.rows });
    }

    if (type === "top-items") {
      const r = await pool.query(
        `SELECT oi.item_id, i.name,
                SUM(oi.quantity)::numeric AS units,
                SUM(oi.line_total)::numeric AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
         JOIN items i ON i.id = oi.item_id
         WHERE o.business_id = $1 AND oi.deleted_at IS NULL AND o.status = 'completed'
           AND ($2::timestamptz IS NULL OR o.created_at >= $2)
           AND ($3::timestamptz IS NULL OR o.created_at < $3)
         GROUP BY oi.item_id, i.name
         ORDER BY revenue DESC
         LIMIT 15`,
        [businessId, from ? new Date(from) : null, to ? new Date(to) : null]
      );
      return jsonOk({ topItems: r.rows });
    }

    return Response.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err) {
    return handleRouteError(err);
  }
}
