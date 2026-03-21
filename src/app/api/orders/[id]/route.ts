import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { orderPatchSchema } from "@/lib/validation/schemas";

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
    const o = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId]
    );
    if (o.rows.length === 0) throw new Error("Not found");
    const items = await pool.query(
      `SELECT oi.*, i.name AS item_name
       FROM order_items oi
       JOIN items i ON i.id = oi.item_id
       WHERE oi.order_id = $1 AND oi.deleted_at IS NULL`,
      [id]
    );
    const pays = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return jsonOk({ order: o.rows[0], orderItems: items.rows, payments: pays.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = orderPatchSchema.parse(await parseJson(req));
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.status !== undefined) {
      fields.push(`status = $${i++}`);
      vals.push(body.status);
    }
    if (body.paymentStatus !== undefined) {
      fields.push(`payment_status = $${i++}`);
      vals.push(body.paymentStatus);
    }
    if (body.notes !== undefined) {
      fields.push(`notes = $${i++}`);
      vals.push(body.notes);
    }
    if (body.kitchenStatus !== undefined) {
      fields.push(`kitchen_status = $${i++}`);
      vals.push(body.kitchenStatus);
    }
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM orders WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ order: cur.rows[0] });
    }
    fields.push(`updated_at = now()`);
    vals.push(id, businessId);
    const q = `UPDATE orders SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ order: r.rows[0] });
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
      `UPDATE orders SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
