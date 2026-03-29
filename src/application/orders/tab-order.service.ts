import { pool } from "@/infrastructure/database/pool";
import { HttpError } from "@/shared/kernel/http";

import { applyPostCheckoutEffects } from "@/application/orders/post-checkout-effects";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function makeOrderNumber() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `ORD-${t}-${r}`.toUpperCase();
}

function assertFinite(label: string, n: number) {
  if (!Number.isFinite(n)) {
    throw new HttpError(`Invalid ${label}`, 400, "INVALID_NUMBER");
  }
}

type LineInput = {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  lineDiscount?: number;
};

type PaymentLine = {
  method: "cash" | "upi" | "card" | "other";
  amount: number;
  reference?: string | null;
};

/** Create an unpaid tab (open order) and mark table occupied — no inventory movement yet. */
export async function openTabOrder(input: {
  businessId: string;
  userId: string;
  customerId?: string | null;
  tableId: string;
  lines: LineInput[];
  notes?: string | null;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const t = await client.query(
      `SELECT id, status, current_order_id FROM restaurant_tables
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [input.tableId, input.businessId]
    );
    if (t.rows.length === 0) throw new HttpError("Table not found", 404, "TABLE_NOT_FOUND");
    const st = String(t.rows[0].status);
    if (t.rows[0].current_order_id != null) {
      throw new HttpError("Table already has an active order", 409, "TABLE_OCCUPIED");
    }
    if (st !== "available" && st !== "free") {
      throw new HttpError("Table is not available", 409, "TABLE_NOT_AVAILABLE");
    }

    const uniqueItemIds = [...new Set(input.lines.map((l) => l.itemId))];
    const itemsRes = await client.query(
      `SELECT id, price, tax_rate, track_inventory, kind
       FROM items
       WHERE business_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL FOR UPDATE`,
      [input.businessId, uniqueItemIds]
    );
    if (itemsRes.rows.length !== uniqueItemIds.length) {
      throw new HttpError("One or more items not found", 404, "ITEMS_NOT_FOUND");
    }
    const itemById = new Map(itemsRes.rows.map((row) => [row.id as string, row]));

    let sumSub = 0;
    let sumTax = 0;
    const computed: {
      itemId: string;
      quantity: number;
      unit_price: number;
      discount: number;
      tax_amount: number;
      line_total: number;
    }[] = [];

    for (const line of input.lines) {
      const row = itemById.get(line.itemId);
      if (!row) throw new HttpError("Item missing", 400, "ITEM_MISSING");
      const unit = line.unitPrice !== undefined ? line.unitPrice : Number(row.price);
      assertFinite("price", unit);
      const qty = line.quantity;
      const lineDisc = line.lineDiscount ?? 0;
      const lineGrossPreDisc = unit * qty;
      if (lineDisc > lineGrossPreDisc + 1e-6) {
        throw new HttpError("Line discount cannot exceed line subtotal", 400, "LINE_DISCOUNT");
      }
      const taxRate = Number(row.tax_rate) / 100;
      const lineSub = round2(unit * qty - lineDisc);
      const lineTax = round2(lineSub * taxRate);
      const lineTotal = round2(lineSub + lineTax);
      sumSub += lineSub;
      sumTax += lineTax;
      computed.push({
        itemId: line.itemId,
        quantity: qty,
        unit_price: unit,
        discount: lineDisc,
        tax_amount: lineTax,
        line_total: lineTotal,
      });
    }

    const subtotalAfter = round2(sumSub);
    const taxAfter = round2(sumTax);
    const total = round2(subtotalAfter + taxAfter);

    let orderNumber = makeOrderNumber();
    for (let i = 0; i < 5; i++) {
      const dup = await client.query(
        `SELECT 1 FROM orders WHERE business_id = $1 AND order_number = $2`,
        [input.businessId, orderNumber]
      );
      if (dup.rowCount === 0) break;
      orderNumber = makeOrderNumber();
    }

    const orderInsert = await client.query(
      `INSERT INTO orders (
        business_id, customer_id, order_number, status, payment_status,
        subtotal, discount_amount, tax_amount, total, notes, table_id, created_by
      ) VALUES ($1,$2,$3,'open','unpaid',$4,0,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        input.businessId,
        input.customerId ?? null,
        orderNumber,
        subtotalAfter,
        taxAfter,
        total,
        input.notes ?? null,
        input.tableId,
        input.userId,
      ]
    );
    const order = orderInsert.rows[0];
    if (!order?.id) throw new HttpError("Could not create order", 500, "ORDER_INSERT_FAILED");

    for (const cl of computed) {
      await client.query(
        `INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, discount, tax_amount, line_total, kitchen_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id,
          cl.itemId,
          cl.quantity,
          cl.unit_price,
          cl.discount,
          cl.tax_amount,
          cl.line_total,
          null,
        ]
      );
    }

    await client.query(
      `UPDATE restaurant_tables
       SET status = 'occupied', current_order_id = $1, updated_at = now()
       WHERE id = $2 AND business_id = $3`,
      [order.id, input.tableId, input.businessId]
    );

    await client.query("COMMIT");
    return order;
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

/** Pay an open tab — inventory + payments + loyalty + free table. */
export async function completeOpenOrder(input: {
  businessId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  payments: PaymentLine[];
  attributedStaffId?: string | null;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ord = await client.query(
      `SELECT * FROM orders
       WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [input.orderId, input.businessId]
    );
    if (ord.rows.length === 0) throw new HttpError("Order not found", 404, "NOT_FOUND");
    const o = ord.rows[0];
    if (o.status !== "open") {
      throw new HttpError("Order is not open", 400, "ORDER_NOT_OPEN");
    }

    const oi = await client.query(
      `SELECT oi.*, i.price AS catalog_price, i.tax_rate, i.track_inventory, i.kind
       FROM order_items oi
       JOIN items i ON i.id = oi.item_id AND i.deleted_at IS NULL
       WHERE oi.order_id = $1 AND oi.deleted_at IS NULL`,
      [input.orderId]
    );

    type ComputedLine = {
      itemId: string;
      quantity: number;
      unit_price: number;
      discount: number;
      tax_amount: number;
      line_total: number;
      track_inventory: boolean;
    };

    const computed: ComputedLine[] = [];
    let sumSub = 0;
    let sumTax = 0;

    for (const row of oi.rows) {
      const unit = Number(row.unit_price);
      const qty = Number(row.quantity);
      const lineDisc = Number(row.discount ?? 0);
      assertFinite("price", unit);
      const taxRate = Number(row.tax_rate) / 100;
      const lineSub = round2(unit * qty - lineDisc);
      const lineTax = round2(lineSub * taxRate);
      const lineTotal = round2(lineSub + lineTax);
      sumSub += lineSub;
      sumTax += lineTax;
      computed.push({
        itemId: row.item_id as string,
        quantity: qty,
        unit_price: unit,
        discount: lineDisc,
        tax_amount: lineTax,
        line_total: lineTotal,
        track_inventory: Boolean(row.track_inventory) && row.kind === "product",
      });
    }

    const discount = round2(Math.min(input.discountAmount, sumSub));
    const scale = sumSub > 0 ? (sumSub - discount) / sumSub : 0;
    const subtotalAfter = round2(sumSub - discount);
    const taxAfter = round2(sumTax * scale);
    const total = round2(subtotalAfter + taxAfter);

    if (!input.payments.length) {
      throw new HttpError("At least one payment line is required", 400, "NO_PAYMENTS");
    }
    const paidTotal = round2(input.payments.reduce((s, p) => s + p.amount, 0));
    if (round2(paidTotal) < total) {
      throw new HttpError(`Payment total must be at least ₹${total.toFixed(2)}`, 400, "PAYMENT_TOO_LOW");
    }

    await client.query(
      `UPDATE orders SET
        subtotal = $1,
        discount_amount = $2,
        tax_amount = $3,
        total = $4,
        status = 'completed',
        payment_status = 'paid',
        attributed_staff_id = COALESCE($5, attributed_staff_id),
        updated_at = now()
       WHERE id = $6`,
      [
        subtotalAfter,
        discount,
        taxAfter,
        total,
        input.attributedStaffId ?? null,
        input.orderId,
      ]
    );

    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [input.orderId]);

    for (const cl of computed) {
      const lineSub = round2(cl.unit_price * cl.quantity - cl.discount);
      const lineTaxAdj = round2(cl.tax_amount * scale);
      const lineTotalAdj = round2(lineSub * scale + lineTaxAdj);
      await client.query(
        `INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, discount, tax_amount, line_total
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          input.orderId,
          cl.itemId,
          cl.quantity,
          cl.unit_price,
          cl.discount,
          lineTaxAdj,
          lineTotalAdj,
        ]
      );

      if (cl.track_inventory) {
        const inv = await client.query(
          `SELECT * FROM inventory
           WHERE business_id = $1 AND item_id = $2 AND deleted_at IS NULL FOR UPDATE`,
          [input.businessId, cl.itemId]
        );
        if (inv.rows.length === 0) {
          throw new HttpError("Inventory row missing for a tracked item", 400, "NO_INVENTORY_ROW");
        }
        const qty = Number(inv.rows[0].quantity);
        const delta = -cl.quantity;
        if (qty + delta < 0) {
          throw new HttpError(`Insufficient stock`, 409, "INSUFFICIENT_STOCK");
        }
        await client.query(
          `UPDATE inventory SET quantity = quantity + $1, updated_at = now() WHERE id = $2`,
          [delta, inv.rows[0].id]
        );
        await client.query(
          `INSERT INTO inventory_transactions (
            business_id, item_id, quantity_delta, tx_type, reference_type, reference_id, created_by
          ) VALUES ($1,$2,$3,'sale','order',$4,$5)`,
          [input.businessId, cl.itemId, delta, input.orderId, input.userId]
        );
      }
    }

    for (const p of input.payments) {
      await client.query(
        `INSERT INTO payments (business_id, order_id, method, amount, reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [input.businessId, input.orderId, p.method, p.amount, p.reference ?? null]
      );
    }

    await applyPostCheckoutEffects(client, {
      businessId: input.businessId,
      customerId: o.customer_id as string | null,
      tableId: o.table_id as string | null,
      orderId: input.orderId,
      total,
      attributedStaffId: input.attributedStaffId ?? (o.attributed_staff_id as string | null),
    });

    const out = await client.query(`SELECT * FROM orders WHERE id = $1`, [input.orderId]);
    await client.query("COMMIT");
    return out.rows[0];
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
