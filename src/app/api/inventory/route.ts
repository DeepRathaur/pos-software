import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { inventoryRowCreateSchema } from "@/lib/validation/schemas";

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
      `SELECT i.*, it.name AS item_name, it.sku
       FROM inventory i
       JOIN items it ON it.id = i.item_id AND it.deleted_at IS NULL
       WHERE i.business_id = $1 AND i.deleted_at IS NULL
       ORDER BY it.name ASC
       LIMIT 1000`,
      [businessId]
    );
    return jsonOk({ inventory: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = inventoryRowCreateSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const exists = await client.query(
        `SELECT id FROM inventory WHERE business_id = $1 AND item_id = $2 AND deleted_at IS NULL`,
        [body.businessId, body.itemId]
      );
      if (exists.rows.length > 0) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Inventory row already exists for this item" }, { status: 409 });
      }
      const ins = await client.query(
        `INSERT INTO inventory (business_id, item_id, quantity, reorder_level, location)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [body.businessId, body.itemId, body.quantity, body.reorderLevel, body.location ?? null]
      );
      const invRow = ins.rows[0];
      if (Number(body.quantity) !== 0) {
        await client.query(
          `INSERT INTO inventory_transactions (
            business_id, item_id, quantity_delta, tx_type, reference_type, reference_id, created_by
          ) VALUES ($1,$2,$3,'initial',NULL,NULL,$4)`,
          [body.businessId, body.itemId, body.quantity, session.sub]
        );
      }
      await client.query("COMMIT");
      return jsonOk({ inventory: invRow }, { status: 201 });
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
