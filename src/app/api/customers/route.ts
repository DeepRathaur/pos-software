import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { customerCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const q = searchParams.get("q");
    const r = q
      ? await pool.query(
          `SELECT * FROM customers
           WHERE business_id = $1 AND deleted_at IS NULL
             AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
           ORDER BY name ASC LIMIT 200`,
          [businessId, `%${q}%`]
        )
      : await pool.query(
          `SELECT * FROM customers WHERE business_id = $1 AND deleted_at IS NULL ORDER BY name ASC LIMIT 500`,
          [businessId]
        );
    return jsonOk({ customers: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = customerCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO customers (business_id, name, phone, email, loyalty_points, metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [
        body.businessId,
        body.name,
        body.phone ?? null,
        body.email ?? null,
        body.loyaltyPoints ?? 0,
        JSON.stringify(body.metadata ?? {}),
      ]
    );
    return jsonOk({ customer: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
