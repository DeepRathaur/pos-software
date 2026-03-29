import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { recordPurchase } from "@/application/purchases/record-purchase.service";
import { purchaseCreateSchema } from "@/lib/validation/schemas";

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
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.deleted_at IS NULL
       WHERE p.business_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [businessId]
    );
    return jsonOk({ purchases: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = purchaseCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const purchase = await recordPurchase({
      businessId: body.businessId,
      userId: session.sub,
      supplierId: body.supplierId ?? null,
      notes: body.notes ?? null,
      lines: body.lines,
    });
    return jsonOk({ purchase }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
