import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const patchSchema = z.object({
  businessId: z.string().uuid(),
  reference: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const r = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ payment: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = patchSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.reference !== undefined) {
      fields.push(`reference = $${i++}`);
      vals.push(body.reference);
    }
    if (body.metadata !== undefined) {
      fields.push(`metadata = $${i++}::jsonb`);
      vals.push(body.metadata);
    }
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM payments WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, body.businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ payment: cur.rows[0] });
    }
    vals.push(id, body.businessId);
    const q = `UPDATE payments SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ payment: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const r = await pool.query(
      `UPDATE payments SET deleted_at = now() WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING order_id`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    const orderId = r.rows[0].order_id as string;
    const sumP = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id = $1 AND deleted_at IS NULL`,
      [orderId]
    );
    const ord = await pool.query(`SELECT total FROM orders WHERE id = $1`, [orderId]);
    const paid = Number(sumP.rows[0].s);
    const total = Number(ord.rows[0]?.total ?? 0);
    let ps: "unpaid" | "partial" | "paid" | "refunded" = "unpaid";
    if (paid >= total) ps = "paid";
    else if (paid > 0) ps = "partial";
    await pool.query(`UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2`, [
      ps,
      orderId,
    ]);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
