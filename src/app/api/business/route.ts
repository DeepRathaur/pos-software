import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { businessCreateSchema } from "@/lib/validation/schemas";
import { modulesForBusinessType } from "@/lib/feature-modules";
import { listBusinessesForUser } from "@/lib/business-access";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const rows = await listBusinessesForUser(session.sub);
    return jsonOk({ businesses: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = businessCreateSchema.parse(await parseJson(req));
    const mods = modulesForBusinessType(body.businessType);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        `INSERT INTO businesses (name, business_type, enabled_modules, settings)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [body.name, body.businessType, mods, {}]
      );
      const b = ins.rows[0];
      await client.query(
        `INSERT INTO business_users (business_id, user_id, role) VALUES ($1,$2,'owner')`,
        [b.id, session.sub]
      );
      await client.query("COMMIT");
      return jsonOk({ business: b }, { status: 201 });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
