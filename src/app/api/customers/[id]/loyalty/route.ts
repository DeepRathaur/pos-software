import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { loyaltyAdjustSchema } from "@/lib/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = loyaltyAdjustSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);

    const cur = await pool.query(
      `SELECT loyalty_points, credit_balance FROM customers WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, body.businessId]
    );
    if (cur.rows.length === 0) throw new Error("Not found");

    let lp = Number(cur.rows[0].loyalty_points);
    let cr = Number(cur.rows[0].credit_balance);

    if (body.redeemPoints !== undefined && body.redeemPoints > 0) {
      if (lp + 1e-9 < body.redeemPoints) {
        return Response.json({ error: "Insufficient loyalty points" }, { status: 400 });
      }
      lp -= body.redeemPoints;
    }

    if (body.addCredit !== undefined && body.addCredit !== 0) {
      cr = round2(cr + body.addCredit);
    }

    const r = await pool.query(
      `UPDATE customers SET loyalty_points = $1, credit_balance = $2, updated_at = now()
       WHERE id = $3 AND business_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [lp, cr, id, body.businessId]
    );
    return jsonOk({ customer: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
