import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { staffPatchSchema } from "@/lib/validation/schemas";

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
      `SELECT * FROM staff WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ staff: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = staffPatchSchema.parse(await parseJson(req));
    const businessId = body.businessId;
    if (!businessId) {
      return Response.json({ error: "businessId is required in body" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.name !== undefined) {
      fields.push(`name = $${i++}`);
      vals.push(body.name);
    }
    if (body.role !== undefined) {
      fields.push(`role = $${i++}`);
      vals.push(body.role);
    }
    if (body.phone !== undefined) {
      fields.push(`phone = $${i++}`);
      vals.push(body.phone);
    }
    if (body.userId !== undefined) {
      fields.push(`user_id = $${i++}`);
      vals.push(body.userId);
    }
    if (body.schedule !== undefined) {
      fields.push(`schedule = $${i++}::jsonb`);
      vals.push(body.schedule);
    }
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM staff WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ staff: cur.rows[0] });
    }
    fields.push(`updated_at = now()`);
    vals.push(id, businessId);
    const q = `UPDATE staff SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ staff: r.rows[0] });
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
      `UPDATE staff SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
