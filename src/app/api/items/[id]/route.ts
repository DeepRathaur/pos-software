import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { itemPatchSchema } from "@/lib/validation/schemas";

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
      `SELECT * FROM items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ item: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = itemPatchSchema.parse(await parseJson(req));
    const businessId = body.businessId;
    if (!businessId) {
      return Response.json({ error: "businessId is required in body" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    const set = (col: string, v: unknown) => {
      fields.push(`${col} = $${i++}`);
      vals.push(v);
    };
    if (body.categoryId !== undefined) set("category_id", body.categoryId);
    if (body.kind !== undefined) set("kind", body.kind);
    if (body.name !== undefined) set("name", body.name);
    if (body.sku !== undefined) set("sku", body.sku);
    if (body.barcode !== undefined) set("barcode", body.barcode);
    if (body.imageUrl !== undefined) set("image_url", body.imageUrl);
    if (body.description !== undefined) set("description", body.description);
    if (body.price !== undefined) set("price", body.price);
    if (body.cost !== undefined) set("cost", body.cost);
    if (body.taxRate !== undefined) set("tax_rate", body.taxRate);
    if (body.trackInventory !== undefined) set("track_inventory", body.trackInventory);
    if (body.durationMinutes !== undefined) set("duration_minutes", body.durationMinutes);
    if (body.staffRequired !== undefined) set("staff_required", body.staffRequired);
    if (body.metadata !== undefined) {
      fields.push(`metadata = $${i++}::jsonb`);
      vals.push(body.metadata);
    }
    if (body.isActive !== undefined) set("is_active", body.isActive);
    if (fields.length === 0) {
      const cur = await pool.query(
        `SELECT * FROM items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [id, businessId]
      );
      if (cur.rows.length === 0) throw new Error("Not found");
      return jsonOk({ item: cur.rows[0] });
    }
    fields.push(`updated_at = now()`);
    vals.push(id, businessId);
    const q = `UPDATE items SET ${fields.join(", ")} WHERE id = $${i++} AND business_id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ item: r.rows[0] });
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
      `UPDATE items SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
