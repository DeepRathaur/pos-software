import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const paySchema = z.object({
  businessId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  notes: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireUser(req);
  const { id: purchaseId } = await ctx.params;
  const body = paySchema.parse(await parseJson(req));
  await assertBusinessMembership(session.sub, body.businessId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const p = await client.query(
      `SELECT * FROM purchases WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [purchaseId, body.businessId]
    );
    if (p.rows.length === 0) throw new Error("Not found");
    const total = Number(p.rows[0].total);
    const paid = Number(p.rows[0].amount_paid ?? 0);
    const next = round2(paid + body.amount);
    if (next > total + 1e-6) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Payment exceeds purchase balance" }, { status: 400 });
    }

    await client.query(
      `INSERT INTO supplier_payments (business_id, purchase_id, amount, notes)
       VALUES ($1,$2,$3,$4)`,
      [body.businessId, purchaseId, body.amount, body.notes ?? null]
    );
    await client.query(`UPDATE purchases SET amount_paid = $1, updated_at = now() WHERE id = $2`, [
      next,
      purchaseId,
    ]);
    await client.query("COMMIT");

    const out = await pool.query(`SELECT * FROM purchases WHERE id = $1`, [purchaseId]);
    return jsonOk({ purchase: out.rows[0] });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    return handleRouteError(err);
  } finally {
    client.release();
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
