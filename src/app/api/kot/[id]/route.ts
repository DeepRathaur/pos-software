import { pool } from "@/lib/db";
import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { z } from "zod";

const patchSchema = z.object({
  businessId: z.string().uuid(),
  status: z.enum(["pending", "preparing", "ready"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = patchSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const r = await pool.query(
      `UPDATE kot SET status = $1, updated_at = now()
       WHERE id = $2 AND business_id = $3
       RETURNING *`,
      [body.status, id, body.businessId]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ kot: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}
