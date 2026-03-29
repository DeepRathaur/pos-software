import { applyPostCheckoutEffects } from "@/application/orders/post-checkout-effects";
import { pool } from "@/infrastructure/database/pool";
import { HttpError } from "@/shared/kernel/http";

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

type CheckoutInput = {
  businessId: string;
  userId: string;
  customerId?: string | null;
  tableId?: string | null;
  /** Optional staff attribution for commission rollups */
  attributedStaffId?: string | null;
  lines: LineInput[];
  discountAmount: number;
  notes?: string | null;
  /** One or more payment lines (split tender). Sum must cover order total. */
  payments: PaymentLine[];
};

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
    throw new HttpError(`Invalid ${label} for one or more line items`, 400, "INVALID_NUMBER");
  }
}

export async function checkoutOrder(input: CheckoutInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const uniqueItemIds = [...new Set(input.lines.map((l) => l.itemId))];
    const itemsRes = await client.query(
      `SELECT id, price, tax_rate, track_inventory, kind
       FROM items
       WHERE business_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL FOR UPDATE`,
      [input.businessId, uniqueItemIds]
    );
    if (itemsRes.rows.length !== uniqueItemIds.length) {
      throw new HttpError("One or more items not found or not in this business", 404, "ITEMS_NOT_FOUND");
    }
    const itemById = new Map(itemsRes.rows.map((row) => [row.id as string, row]));

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

    for (const line of input.lines) {
      const row = itemById.get(line.itemId);
      if (!row) throw new HttpError("Item missing", 400, "ITEM_MISSING");
      const unit =
        line.unitPrice !== undefined ? line.unitPrice : Number(row.price);
      assertFinite("price", unit);
      const qty = line.quantity;
      const lineDisc = line.lineDiscount ?? 0;
      assertFinite("discount", lineDisc);
      const lineGrossPreDisc = unit * qty;
      if (lineDisc > lineGrossPreDisc + 1e-6) {
        throw new HttpError("Line discount cannot exceed line subtotal", 400, "LINE_DISCOUNT");
      }
      const taxRate = Number(row.tax_rate) / 100;
      assertFinite("tax rate", taxRate);
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
    for (const p of input.payments) {
      if (!Number.isFinite(p.amount) || p.amount <= 0) {
        throw new HttpError("Invalid payment amount", 400, "INVALID_PAYMENT");
      }
    }
    const paidTotal = round2(input.payments.reduce((s, p) => s + p.amount, 0));

    if (round2(paidTotal) < total) {
      throw new HttpError(
        `Payment total must be at least ₹${total.toFixed(2)}`,
        400,
        "PAYMENT_TOO_LOW"
      );
    }

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
        subtotal, discount_amount, tax_amount, total, notes, table_id, attributed_staff_id, created_by
      ) VALUES ($1,$2,$3,'completed','paid',$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        input.businessId,
        input.customerId ?? null,
        orderNumber,
        subtotalAfter,
        discount,
        taxAfter,
        total,
        input.notes ?? null,
        input.tableId ?? null,
        input.attributedStaffId ?? null,
        input.userId,
      ]
    );
    const order = orderInsert.rows[0];
    if (!order?.id) {
      throw new HttpError("Could not create order", 500, "ORDER_INSERT_FAILED");
    }

    for (const cl of computed) {
      const lineSub = round2(cl.unit_price * cl.quantity - cl.discount);
      const lineTaxAdj = round2(cl.tax_amount * scale);
      const lineTotalAdj = round2(lineSub * scale + lineTaxAdj);
      await client.query(
        `INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, discount, tax_amount, line_total
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
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
          throw new HttpError(
            "Stock is not set up for one or more items — create an inventory row first",
            400,
            "NO_INVENTORY_ROW"
          );
        }
        const qty = Number(inv.rows[0].quantity);
        if (!Number.isFinite(qty)) {
          throw new HttpError("Invalid stock quantity in database", 500, "INVALID_STOCK");
        }
        const delta = -cl.quantity;
        if (qty + delta < 0) {
          throw new HttpError(
            `Insufficient stock (available ${qty}, needed ${cl.quantity})`,
            409,
            "INSUFFICIENT_STOCK"
          );
        }
        await client.query(
          `UPDATE inventory SET quantity = quantity + $1, updated_at = now()
           WHERE id = $2`,
          [delta, inv.rows[0].id]
        );
        await client.query(
          `INSERT INTO inventory_transactions (
            business_id, item_id, quantity_delta, tx_type, reference_type, reference_id, created_by
          ) VALUES ($1,$2,$3,'sale','order',$4,$5)`,
          [input.businessId, cl.itemId, delta, order.id, input.userId]
        );
      }
    }

    for (const p of input.payments) {
      await client.query(
        `INSERT INTO payments (business_id, order_id, method, amount, reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [input.businessId, order.id, p.method, p.amount, p.reference ?? null]
      );
    }

    await applyPostCheckoutEffects(client, {
      businessId: input.businessId,
      customerId: input.customerId,
      tableId: input.tableId,
      orderId: order.id as string,
      total,
      attributedStaffId: input.attributedStaffId,
    });

    await client.query("COMMIT");
    return order;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection may already be aborted */
    }
    throw e;
  } finally {
    client.release();
  }
}
