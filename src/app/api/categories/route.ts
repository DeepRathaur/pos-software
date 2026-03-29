import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { categoryCreateSchema } from "@/lib/validation/schemas";

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
      `SELECT * FROM categories
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, name ASC
       LIMIT 500`,
      [businessId]
    );
    return jsonOk({ categories: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = categoryCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO categories (business_id, name, parent_id, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [body.businessId, body.name, body.parentId ?? null, body.sortOrder]
    );
    return jsonOk({ category: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
