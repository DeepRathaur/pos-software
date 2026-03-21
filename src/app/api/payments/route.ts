import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { paymentCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const orderId = searchParams.get("orderId");
    const r = orderId
      ? await pool.query(
          `SELECT * FROM payments WHERE business_id = $1 AND order_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC`,
          [businessId, orderId]
        )
      : await pool.query(
          `SELECT * FROM payments WHERE business_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`,
          [businessId]
        );
    return jsonOk({ payments: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = paymentCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ord = await pool.query(
      `SELECT id, total, payment_status FROM orders WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [body.orderId, body.businessId]
    );
    if (ord.rows.length === 0) throw new Error("Order not found");
    const ins = await pool.query(
      `INSERT INTO payments (business_id, order_id, method, amount, reference)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [body.businessId, body.orderId, body.method, body.amount, body.reference ?? null]
    );
    const sumP = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id = $1 AND deleted_at IS NULL`,
      [body.orderId]
    );
    const paid = Number(sumP.rows[0].s);
    const total = Number(ord.rows[0].total);
    let ps: "unpaid" | "partial" | "paid" | "refunded" = "unpaid";
    if (paid >= total) ps = "paid";
    else if (paid > 0) ps = "partial";
    await pool.query(`UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2`, [
      ps,
      body.orderId,
    ]);
    return jsonOk({ payment: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
