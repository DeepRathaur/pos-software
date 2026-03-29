import type { PoolClient } from "pg";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Loyalty points, table release, staff performance — run inside same DB transaction as checkout.
 */
export async function applyPostCheckoutEffects(
  client: PoolClient,
  params: {
    businessId: string;
    customerId: string | null | undefined;
    tableId: string | null | undefined;
    orderId: string;
    total: number;
    attributedStaffId: string | null | undefined;
  }
) {
  const { businessId, customerId, tableId, orderId, total, attributedStaffId } = params;

  const b = await client.query(`SELECT settings FROM businesses WHERE id = $1`, [businessId]);
  const settings = (b.rows[0]?.settings ?? {}) as Record<string, unknown>;
  const per100 = Number(settings.loyaltyPointsPer100 ?? 1);
  const earned = Math.floor(total / 100) * (Number.isFinite(per100) ? per100 : 1);

  if (customerId && earned > 0) {
    await client.query(
      `UPDATE customers SET loyalty_points = loyalty_points + $1, updated_at = now()
       WHERE id = $2 AND business_id = $3 AND deleted_at IS NULL`,
      [earned, customerId, businessId]
    );
  }

  if (tableId) {
    await client.query(
      `UPDATE restaurant_tables
       SET status = 'available',
           current_order_id = NULL,
           updated_at = now()
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [tableId, businessId]
    );
  }

  if (attributedStaffId) {
    await client.query(
      `INSERT INTO staff_performance (staff_id, business_id, total_services, total_revenue, updated_at)
       VALUES ($1, $2, 1, $3, now())
       ON CONFLICT (staff_id) DO UPDATE SET
         total_services = staff_performance.total_services + 1,
         total_revenue = staff_performance.total_revenue + EXCLUDED.total_revenue,
         updated_at = now()`,
      [attributedStaffId, businessId, round2(total)]
    );
  }
}
