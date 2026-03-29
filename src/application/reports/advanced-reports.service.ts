import { pool } from "@/infrastructure/database/pool";

export async function fetchAdvancedReports(businessId: string) {
  const now = new Date();
  const startDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgo = new Date(startDay);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    salesToday,
    salesWeek,
    salesMonth,
    topProducts,
    lowStock,
    staffRank,
    topCustomers,
    repeatCustomers,
    purchaseOutstanding,
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(total),0)::numeric AS revenue, COUNT(*)::int AS orders
       FROM orders WHERE business_id = $1 AND deleted_at IS NULL AND status = 'completed'
         AND created_at >= $2 AND created_at < $3`,
      [businessId, startDay, new Date(startDay.getTime() + 86400000)]
    ),
    pool.query(
      `SELECT COALESCE(SUM(total),0)::numeric AS revenue, COUNT(*)::int AS orders
       FROM orders WHERE business_id = $1 AND deleted_at IS NULL AND status = 'completed'
         AND created_at >= $2`,
      [businessId, weekAgo]
    ),
    pool.query(
      `SELECT COALESCE(SUM(total),0)::numeric AS revenue, COUNT(*)::int AS orders
       FROM orders WHERE business_id = $1 AND deleted_at IS NULL AND status = 'completed'
         AND created_at >= $2`,
      [businessId, monthStart]
    ),
    pool.query(
      `SELECT oi.item_id::text, i.name,
              SUM(oi.quantity)::numeric AS units,
              SUM(oi.line_total)::numeric AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
       JOIN items i ON i.id = oi.item_id
       WHERE o.business_id = $1 AND oi.deleted_at IS NULL AND o.status = 'completed'
         AND o.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY oi.item_id, i.name
       ORDER BY SUM(oi.line_total) DESC NULLS LAST
       LIMIT 15`,
      [businessId]
    ),
    pool.query(
      `SELECT i.item_id::text, it.name, i.quantity::numeric AS quantity, i.reorder_level::numeric AS reorder_level
       FROM inventory i
       JOIN items it ON it.id = i.item_id AND it.deleted_at IS NULL
       WHERE i.business_id = $1 AND i.deleted_at IS NULL AND it.track_inventory = true
         AND i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC LIMIT 25`,
      [businessId]
    ),
    pool.query(
      `SELECT s.id::text, s.name,
              sp.total_revenue::numeric AS revenue,
              sp.total_services::int AS services,
              s.commission_rate::numeric AS commission_rate
       FROM staff s
       LEFT JOIN staff_performance sp ON sp.staff_id = s.id
       WHERE s.business_id = $1 AND s.deleted_at IS NULL
       ORDER BY COALESCE(sp.total_revenue, 0) DESC NULLS LAST
       LIMIT 25`,
      [businessId]
    ),
    pool.query(
      `SELECT c.id::text, c.name,
              COALESCE(SUM(o.total),0)::numeric AS spend,
              COUNT(o.id)::int AS order_count
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL AND o.status = 'completed'
       WHERE c.business_id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id, c.name
       ORDER BY COALESCE(SUM(o.total),0) DESC
       LIMIT 15`,
      [businessId]
    ),
    pool.query(
      `SELECT c.id::text, c.name, COUNT(o.id)::int AS order_count
       FROM customers c
       INNER JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL AND o.status = 'completed'
       WHERE c.business_id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id, c.name
       HAVING COUNT(o.id) >= 2
       ORDER BY COUNT(o.id) DESC
       LIMIT 15`,
      [businessId]
    ),
    pool.query(
      `SELECT p.id::text, p.total::numeric, p.amount_paid::numeric,
              (p.total - p.amount_paid)::numeric AS balance_due,
              s.name AS supplier_name, p.created_at
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.business_id = $1 AND p.deleted_at IS NULL
         AND p.total > COALESCE(p.amount_paid, 0)
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [businessId]
    ),
  ]);

  return {
    sales: {
      today: {
        revenue: String(salesToday.rows[0]?.revenue ?? 0),
        orders: salesToday.rows[0]?.orders ?? 0,
      },
      week: {
        revenue: String(salesWeek.rows[0]?.revenue ?? 0),
        orders: salesWeek.rows[0]?.orders ?? 0,
      },
      month: {
        revenue: String(salesMonth.rows[0]?.revenue ?? 0),
        orders: salesMonth.rows[0]?.orders ?? 0,
      },
    },
    top_products: topProducts.rows,
    low_stock: lowStock.rows,
    staff: staffRank.rows.map((r) => ({
      ...r,
      commission_estimate: (Number(r.revenue ?? 0) * Number(r.commission_rate ?? 0)) / 100,
    })),
    top_customers: topCustomers.rows,
    repeat_customers: repeatCustomers.rows,
    purchase_outstanding: purchaseOutstanding.rows,
  };
}
