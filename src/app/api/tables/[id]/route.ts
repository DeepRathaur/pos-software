import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const patchSchema = z.object({
  businessId: z.string().uuid(),
  label: z.string().min(1).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["available", "occupied", "free"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = patchSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.label !== undefined) {
      fields.push(`label = $${i++}`);
      vals.push(body.label);
    }
    if (body.capacity !== undefined) {
      fields.push(`capacity = $${i++}`);
      vals.push(body.capacity);
    }
    if (body.status !== undefined) {
      const st = body.status === "free" ? "available" : body.status;
      fields.push(`status = $${i++}`);
      vals.push(st);
    }
    if (body.sortOrder !== undefined) {
      fields.push(`sort_order = $${i++}`);
      vals.push(body.sortOrder);
    }
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM restaurant_tables WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, body.businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ table: cur.rows[0] });
    }
    fields.push(`updated_at = now()`);
    vals.push(id, body.businessId);
    const q = `UPDATE restaurant_tables SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ table: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}
