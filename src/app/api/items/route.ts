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
    const q =
      kind === null
        ? `SELECT * FROM items WHERE business_id = $1 AND deleted_at IS NULL ORDER BY name ASC LIMIT 500`
        : `SELECT * FROM items WHERE business_id = $1 AND kind = $2 AND deleted_at IS NULL ORDER BY name ASC LIMIT 500`;
    const r =
      kind === null
        ? await pool.query(q, [businessId])
        : await pool.query(q, [businessId, kind]);
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
        business_id, category_id, kind, name, sku, description, price, cost, tax_rate,
        track_inventory, metadata, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,true)
      RETURNING *`,
      [
        body.businessId,
        body.categoryId ?? null,
        body.kind,
        body.name,
        body.sku ?? null,
        body.description ?? null,
        body.price,
        body.cost ?? null,
        body.taxRate,
        body.trackInventory,
        JSON.stringify(body.metadata ?? {}),
      ]
    );
    return jsonOk({ item: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
