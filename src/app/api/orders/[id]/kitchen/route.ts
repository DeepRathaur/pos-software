import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const bodySchema = z.object({
  businessId: z.string().uuid(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Fire / refresh kitchen ticket for an order (menu items). */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id: orderId } = await ctx.params;
    const body = bodySchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);

    const o = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [orderId, body.businessId]
    );
    if (o.rows.length === 0) throw new Error("Not found");

    await pool.query(
      `INSERT INTO kot (business_id, order_id, status)
       VALUES ($1,$2,'pending')
       ON CONFLICT (order_id) DO UPDATE SET status = 'pending', updated_at = now()`,
      [body.businessId, orderId]
    );

    await pool.query(
      `UPDATE order_items SET kitchen_status = 'pending' WHERE order_id = $1 AND deleted_at IS NULL`,
      [orderId]
    );

    await pool.query(
      `UPDATE orders SET kitchen_status = 'sent', updated_at = now() WHERE id = $1`,
      [orderId]
    );

    return jsonOk({ ok: true, orderId });
  } catch (err) {
    return handleRouteError(err);
  }
}
