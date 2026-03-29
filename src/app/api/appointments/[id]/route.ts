import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { appointmentPatchSchema } from "@/lib/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = appointmentPatchSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.status !== undefined) {
      fields.push(`status = $${i++}`);
      vals.push(body.status);
    }
    if (body.staffId !== undefined) {
      fields.push(`staff_id = $${i++}`);
      vals.push(body.staffId);
    }
    if (body.orderId !== undefined) {
      fields.push(`order_id = $${i++}`);
      vals.push(body.orderId);
    }
    if (body.notes !== undefined) {
      fields.push(`notes = $${i++}`);
      vals.push(body.notes);
    }
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM appointments WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, body.businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ appointment: cur.rows[0] });
    }
    fields.push(`updated_at = now()`);
    vals.push(id, body.businessId);
    const q = `UPDATE appointments SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ appointment: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}
