import { pool } from "@/infrastructure/database/pool";
import { HttpError } from "@/shared/kernel/http";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type Line = { itemId: string; quantity: number; unitCost: number };

export async function recordPurchase(input: {
  businessId: string;
  userId: string;
  supplierId: string | null;
  notes: string | null;
  lines: Line[];
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const total = round2(
      input.lines.reduce((s, l) => s + round2(l.quantity * l.unitCost), 0)
    );

    const pur = await client.query(
      `INSERT INTO purchases (business_id, supplier_id, status, total, notes, amount_paid)
       VALUES ($1,$2,'received',$3,$4,$3)
       RETURNING *`,
      [input.businessId, input.supplierId, total, input.notes ?? null]
    );
    const purchase = pur.rows[0];
    if (!purchase?.id) {
      throw new HttpError("Could not create purchase", 500, "PURCHASE_INSERT_FAILED");
    }

    for (const line of input.lines) {
      await client.query(
        `INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_cost)
         VALUES ($1,$2,$3,$4)`,
        [purchase.id, line.itemId, line.quantity, line.unitCost]
      );

      const itemRes = await client.query(
        `SELECT id, track_inventory, kind FROM items
         WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
        [line.itemId, input.businessId]
      );
      if (itemRes.rows.length === 0) {
        throw new HttpError("Item not found for this business", 404, "ITEM_NOT_FOUND");
      }
      const track = Boolean(itemRes.rows[0].track_inventory) && itemRes.rows[0].kind === "product";
      if (!track) continue;

      const inv = await client.query(
        `SELECT * FROM inventory
         WHERE business_id = $1 AND item_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [input.businessId, line.itemId]
      );
      if (inv.rows.length === 0) {
        throw new HttpError(
          "Inventory row missing for a tracked item — create stock first",
          400,
          "NO_INVENTORY_ROW"
        );
      }
      await client.query(
        `UPDATE inventory SET quantity = quantity + $1, updated_at = now() WHERE id = $2`,
        [line.quantity, inv.rows[0].id]
      );
      await client.query(
        `INSERT INTO inventory_transactions (
          business_id, item_id, quantity_delta, tx_type, reference_type, reference_id, created_by
        ) VALUES ($1,$2,$3,'purchase','purchase',$4,$5)`,
        [input.businessId, line.itemId, line.quantity, purchase.id, input.userId]
      );
    }

    await client.query("COMMIT");
    return purchase;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}
