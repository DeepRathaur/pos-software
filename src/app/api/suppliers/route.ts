import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { supplierCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const r = await pool.query(
      `SELECT * FROM suppliers
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC LIMIT 500`,
      [businessId]
    );
    return jsonOk({ suppliers: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = supplierCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO suppliers (business_id, name, phone, email, address)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        body.businessId,
        body.name,
        body.phone ?? null,
        body.email ?? null,
        body.address ?? null,
      ]
    );
    return jsonOk({ supplier: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
