import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { orderCheckoutSchema } from "@/lib/validation/schemas";
import { checkoutOrder } from "@/lib/orders/checkout";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const rawLimit = Number(searchParams.get("limit") ?? 50);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
    const r = await pool.query(
      `SELECT o.*, c.name AS customer_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.business_id = $1 AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC
       LIMIT $2`,
      [businessId, limit]
    );
    return jsonOk({ orders: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = orderCheckoutSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const payments =
      body.payment != null ? [body.payment] : (body.payments ?? []);
    const order = await checkoutOrder({
      businessId: body.businessId,
      userId: session.sub,
      customerId: body.customerId,
      tableId: body.tableId,
      attributedStaffId: body.attributedStaffId,
      lines: body.lines,
      discountAmount: body.discountAmount,
      notes: body.notes,
      payments,
    });
    return jsonOk({ order }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
