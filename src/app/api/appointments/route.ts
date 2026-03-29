import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { appointmentCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const r = await pool.query(
      `SELECT a.*,
              c.name AS customer_name,
              s.name AS staff_name,
              i.name AS service_name
       FROM appointments a
       LEFT JOIN customers c ON c.id = a.customer_id
       LEFT JOIN staff s ON s.id = a.staff_id
       LEFT JOIN items i ON i.id = a.item_id
       WHERE a.business_id = $1 AND a.deleted_at IS NULL
         AND ($2::timestamptz IS NULL OR a.start_at >= $2)
         AND ($3::timestamptz IS NULL OR a.start_at < $3)
       ORDER BY a.start_at ASC
       LIMIT 500`,
      [businessId, from ? new Date(from) : null, to ? new Date(to) : null]
    );
    return jsonOk({ appointments: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = appointmentCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const ins = await pool.query(
      `INSERT INTO appointments (
        business_id, customer_id, staff_id, item_id, start_at, end_at, status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,'scheduled',$7)
      RETURNING *`,
      [
        body.businessId,
        body.customerId ?? null,
        body.staffId ?? null,
        body.serviceId,
        new Date(body.startAt),
        new Date(body.endAt),
        body.notes ?? null,
      ]
    );
    return jsonOk({ appointment: ins.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
