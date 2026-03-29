import { pool } from "@/infrastructure/database/pool";

/** Rolling window start for "top products" (avoids volatile NOW() in SQL for better index use). */
function topProductsSince(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/** Run all dashboard queries in parallel (single round-trip each). */
export async function fetchDashboardMetrics(
  businessId: string,
  todayStart: Date,
  todayEnd: Date,
  chartStart: Date,
  chartEnd: Date
) {
  const topSince = topProductsSince();
  const [
    salesRow,
    ordersRow,
    profitRow,
    purchasesRow,
    topProducts,
    lowStock,
    salesSeries,
  ] = await Promise.all([
    pool.query<{ sales_today: string }>(
      `SELECT COALESCE(SUM(total), 0)::numeric AS sales_today
       FROM orders
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND status = 'completed'
         AND created_at >= $2 AND created_at < $3`,
      [businessId, todayStart, todayEnd]
    ),
    pool.query<{ orders_today: number }>(
      `SELECT COUNT(*)::int AS orders_today
       FROM orders
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND status = 'completed'
         AND created_at >= $2 AND created_at < $3`,
      [businessId, todayStart, todayEnd]
    ),
    pool.query<{ profit: string }>(
      `SELECT COALESCE(SUM(
         oi.line_total - COALESCE(i.cost, 0) * oi.quantity
       ), 0)::numeric AS profit
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
       INNER JOIN items i ON i.id = oi.item_id AND i.deleted_at IS NULL
       WHERE o.business_id = $1
         AND oi.deleted_at IS NULL
         AND o.status = 'completed'
         AND o.created_at >= $2 AND o.created_at < $3`,
      [businessId, todayStart, todayEnd]
    ),
    pool.query<{ purchases: string }>(
      `SELECT COALESCE(SUM(total), 0)::numeric AS purchases
       FROM purchases
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND created_at >= $2 AND created_at < $3`,
      [businessId, todayStart, todayEnd]
    ),
    pool.query(
      `SELECT oi.item_id::text AS item_id, i.name,
              SUM(oi.quantity)::numeric AS units_sold,
              SUM(oi.line_total)::numeric AS revenue
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
       INNER JOIN items i ON i.id = oi.item_id AND i.deleted_at IS NULL
       WHERE o.business_id = $1
         AND oi.deleted_at IS NULL
         AND o.status = 'completed'
         AND o.created_at >= $2
       GROUP BY oi.item_id, i.name
       ORDER BY SUM(oi.line_total) DESC NULLS LAST
       LIMIT 10`,
      [businessId, topSince]
    ),
    pool.query(
      `SELECT i.item_id::text AS item_id, it.name,
              i.quantity::numeric AS quantity,
              i.reorder_level::numeric AS reorder_level
       FROM inventory i
       INNER JOIN items it ON it.id = i.item_id AND it.deleted_at IS NULL
       WHERE i.business_id = $1
         AND i.deleted_at IS NULL
         AND it.track_inventory = true
         AND i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC
       LIMIT 25`,
      [businessId]
    ),
    pool.query(
      `SELECT date_trunc('day', o.created_at AT TIME ZONE 'UTC') AS day,
              COALESCE(SUM(o.total), 0)::numeric AS sales,
              COUNT(*)::int AS orders
       FROM orders o
       WHERE o.business_id = $1
         AND o.deleted_at IS NULL
         AND o.status = 'completed'
         AND o.created_at >= $2 AND o.created_at < $3
       GROUP BY 1
       ORDER BY 1 ASC`,
      [businessId, chartStart, chartEnd]
    ),
  ]);

  return {
    sales_today: salesRow.rows[0]?.sales_today ?? "0",
    orders_today: ordersRow.rows[0]?.orders_today ?? 0,
    profit: profitRow.rows[0]?.profit ?? "0",
    purchases: purchasesRow.rows[0]?.purchases ?? "0",
    top_products: topProducts.rows.map((r: Record<string, unknown>) => ({
      item_id: String(r.item_id),
      name: String(r.name),
      units_sold: String(r.units_sold),
      revenue: String(r.revenue),
    })),
    low_stock: lowStock.rows.map((r: Record<string, unknown>) => ({
      item_id: String(r.item_id),
      name: String(r.name),
      quantity: String(r.quantity),
      reorder_level: String(r.reorder_level),
    })),
    sales_last_7_days: salesSeries.rows.map((r: Record<string, unknown>) => ({
      day: r.day instanceof Date ? r.day.toISOString() : String(r.day),
      sales: String(r.sales),
      orders: Number(r.orders),
    })),
  };
}
