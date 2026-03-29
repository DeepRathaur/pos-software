import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const createSchema = z.object({
  businessId: z.string().uuid(),
  label: z.string().min(1),
  capacity: z.coerce.number().int().positive().default(4),
  sortOrder: z.coerce.number().int().default(0),
});

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
      `SELECT t.*, o.order_number AS current_order_number, o.status AS order_status, o.total AS order_total
       FROM restaurant_tables t
       LEFT JOIN orders o ON o.id = t.current_order_id AND o.deleted_at IS NULL
       WHERE t.business_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.sort_order ASC, t.label ASC`,
      [businessId]
    );
    return jsonOk({ tables: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = createSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO restaurant_tables (business_id, label, capacity, status, sort_order)
       VALUES ($1,$2,$3,'available',$4)
       RETURNING *`,
      [body.businessId, body.label, body.capacity, body.sortOrder]
    );
    return jsonOk({ table: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
