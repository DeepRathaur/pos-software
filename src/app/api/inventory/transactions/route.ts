import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { inventoryTxSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const itemId = searchParams.get("itemId");
    const rawLimit = Number(searchParams.get("limit") ?? 100);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 100;
    const r = itemId
      ? await pool.query(
          `SELECT t.*, i.name AS item_name
           FROM inventory_transactions t
           JOIN items i ON i.id = t.item_id
           WHERE t.business_id = $1 AND t.item_id = $2 AND t.deleted_at IS NULL
           ORDER BY t.created_at DESC
           LIMIT $3`,
          [businessId, itemId, limit]
        )
      : await pool.query(
          `SELECT t.*, i.name AS item_name
           FROM inventory_transactions t
           JOIN items i ON i.id = t.item_id
           WHERE t.business_id = $1 AND t.deleted_at IS NULL
           ORDER BY t.created_at DESC
           LIMIT $2`,
          [businessId, limit]
        );
    return jsonOk({ transactions: r.rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = inventoryTxSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inv = await client.query(
        `SELECT * FROM inventory
         WHERE business_id = $1 AND item_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [body.businessId, body.itemId]
      );
      if (inv.rows.length === 0) {
        throw new Error("Inventory row not found for item");
      }
      const qty = Number(inv.rows[0].quantity);
      const delta = Number(body.quantityDelta);
      if (qty + delta < 0) {
        throw new Error("Resulting quantity cannot be negative");
      }
      await client.query(`UPDATE inventory SET quantity = quantity + $1, updated_at = now() WHERE id = $2`, [
        delta,
        inv.rows[0].id,
      ]);
      const tx = await client.query(
        `INSERT INTO inventory_transactions (
          business_id, item_id, quantity_delta, tx_type, reference_type, reference_id, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          body.businessId,
          body.itemId,
          delta,
          body.txType,
          body.referenceType ?? null,
          body.referenceId ?? null,
          body.notes ?? null,
          session.sub,
        ]
      );
      await client.query("COMMIT");
      return jsonOk({ transaction: tx.rows[0] }, { status: 201 });
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
