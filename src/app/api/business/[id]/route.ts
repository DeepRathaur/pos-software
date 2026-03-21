import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership, getBusinessForUser } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { businessPatchSchema } from "@/lib/validation/schemas";
import { modulesForBusinessType } from "@/lib/feature-modules";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(_req);
    const { id } = await ctx.params;
    await assertBusinessMembership(session.sub, id);
    const business = await getBusinessForUser(session.sub, id);
    return jsonOk({ business });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    await assertBusinessMembership(session.sub, id);
    const body = businessPatchSchema.parse(await parseJson(req));
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (body.name !== undefined) {
      fields.push(`name = $${i++}`);
      vals.push(body.name);
    }
    if (body.businessType !== undefined) {
      fields.push(`business_type = $${i++}`);
      vals.push(body.businessType);
      fields.push(`enabled_modules = $${i++}`);
      vals.push(modulesForBusinessType(body.businessType));
    }
    if (body.settings !== undefined) {
      fields.push(`settings = $${i++}::jsonb`);
      vals.push(body.settings);
    }
    if (body.enabledModules !== undefined) {
      fields.push(`enabled_modules = $${i++}`);
      vals.push(body.enabledModules);
    }
    if (fields.length === 0) {
      const business = await getBusinessForUser(session.sub, id);
      return jsonOk({ business });
    }
    fields.push(`updated_at = now()`);
    vals.push(id);
    const q = `UPDATE businesses SET ${fields.join(", ")} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`;
    const r = await pool.query(q, vals);
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ business: r.rows[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    await assertBusinessMembership(session.sub, id);
    const r = await pool.query(
      `UPDATE businesses SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    if (r.rows.length === 0) throw new Error("Not found");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
