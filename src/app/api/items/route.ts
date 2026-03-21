import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { itemCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const kind = searchParams.get("kind");
    const barcode = searchParams.get("barcode")?.trim() ?? "";
    const search = searchParams.get("search")?.trim() ?? "";
    const rawLimit = Number(searchParams.get("limit") ?? 200);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.max(Math.floor(rawLimit), 1), 500)
        : 200;

    const where: string[] = ["business_id = $1", "deleted_at IS NULL"];
    const params: unknown[] = [businessId];
    let i = 2;

    if (kind) {
      where.push(`kind = $${i++}`);
      params.push(kind);
    }
    if (barcode.length > 0) {
      where.push(`barcode = $${i++}`);
      params.push(barcode);
    } else if (search.length > 0) {
      where.push(
        `(name ILIKE $${i} OR COALESCE(sku, '') ILIKE $${i} OR COALESCE(barcode, '') ILIKE $${i} OR COALESCE(description, '') ILIKE $${i})`
      );
      params.push(`%${search}%`);
      i++;
    }

    params.push(limit);
    const r = await pool.query(
      `SELECT id, business_id, category_id, kind, name, sku, barcode, image_url, description, price, cost, tax_rate,
              track_inventory, duration_minutes, staff_required, metadata, is_active, created_at, updated_at
       FROM items WHERE ${where.join(" AND ")} ORDER BY name ASC LIMIT $${i}`,
      params
    );
    return jsonOk({ items: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = itemCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO items (
        business_id, category_id, kind, name, sku, barcode, image_url, description, price, cost, tax_rate,
        track_inventory, duration_minutes, staff_required, metadata, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,true)
      RETURNING *`,
      [
        body.businessId,
        body.categoryId ?? null,
        body.kind,
        body.name,
        body.sku ?? null,
        body.barcode ?? null,
        body.imageUrl ?? null,
        body.description ?? null,
        body.price,
        body.cost ?? null,
        body.taxRate,
        body.trackInventory,
        body.durationMinutes ?? null,
        body.staffRequired ?? false,
        JSON.stringify(body.metadata ?? {}),
      ]
    );
    return jsonOk({ item: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
