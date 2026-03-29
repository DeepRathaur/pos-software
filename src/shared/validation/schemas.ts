import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const businessCreateSchema = z.object({
  name: z.string().min(1),
  businessType: z.enum(["retail", "cafe", "salon", "restaurant", "custom"]),
});

export const businessPatchSchema = z.object({
  name: z.string().min(1).optional(),
  businessType: z.enum(["retail", "cafe", "salon", "restaurant", "custom"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  enabledModules: z.array(z.string()).optional(),
});

export const itemCreateSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  kind: z.enum(["product", "service", "menu_item", "recipe_component"]).default("product"),
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  barcode: z.string().max(128).nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  taxRate: z.coerce.number().nonnegative().default(0),
  trackInventory: z.boolean().default(true),
  durationMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
  staffRequired: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const itemPatchSchema = itemCreateSchema.partial().extend({
  businessId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const inventoryRowCreateSchema = z.object({
  businessId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.coerce.number().default(0),
  reorderLevel: z.coerce.number().nonnegative().default(0),
  location: z.string().nullable().optional(),
});

export const inventoryTxSchema = z.object({
  businessId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantityDelta: z.coerce.number(),
  txType: z.enum([
    "sale",
    "purchase",
    "adjustment",
    "return",
    "transfer",
    "initial",
    "waste",
  ]),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const paymentLineSchema = z.object({
  method: z.enum(["cash", "upi", "card", "other"]),
  amount: z.coerce.number().positive(),
  reference: z.string().nullable().optional(),
});

export const orderCheckoutSchema = z
  .object({
    businessId: z.string().uuid(),
    customerId: z.string().uuid().nullable().optional(),
    tableId: z.string().uuid().nullable().optional(),
    attributedStaffId: z.string().uuid().nullable().optional(),
    lines: z
      .array(
        z.object({
          itemId: z.string().uuid(),
          quantity: z.coerce.number().positive(),
          unitPrice: z.coerce.number().nonnegative().optional(),
          lineDiscount: z.coerce.number().nonnegative().optional(),
        })
      )
      .min(1),
    discountAmount: z.coerce.number().nonnegative().default(0),
    notes: z.string().nullable().optional(),
    /** Single-tender checkout (default). */
    payment: paymentLineSchema.optional(),
    /** Split payment: multiple tenders; use instead of `payment`. */
    payments: z.array(paymentLineSchema).min(1).optional(),
  })
  .refine(
    (d) => {
      const hasSingle = d.payment != null;
      const hasMulti = Boolean(d.payments && d.payments.length > 0);
      return (hasSingle && !hasMulti) || (!hasSingle && hasMulti);
    },
    { message: "Provide exactly one of payment or payments", path: ["payment"] }
  );

export const orderPatchSchema = z.object({
  status: z.enum(["draft", "open", "completed", "void", "refunded"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid", "refunded"]).optional(),
  notes: z.string().nullable().optional(),
  kitchenStatus: z.string().nullable().optional(),
});

export const paymentCreateSchema = z.object({
  businessId: z.string().uuid(),
  orderId: z.string().uuid(),
  method: z.enum(["cash", "upi", "card", "other"]),
  amount: z.coerce.number().positive(),
  reference: z.string().nullable().optional(),
});

export const customerCreateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional(),
  loyaltyPoints: z.coerce.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const customerPatchSchema = customerCreateSchema.partial().extend({
  businessId: z.string().uuid().optional(),
});

export const staffCreateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().default("staff"),
  phone: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  commissionRate: z.coerce.number().nonnegative().optional(),
  schedule: z.record(z.string(), z.unknown()).optional(),
});

export const staffPatchSchema = staffCreateSchema.partial().extend({
  businessId: z.string().uuid().optional(),
});

export const categoryCreateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const supplierCreateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const openOrderSchema = z.object({
  businessId: z.string().uuid(),
  tableId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().nonnegative().optional(),
        lineDiscount: z.coerce.number().nonnegative().optional(),
      })
    )
    .min(1),
  notes: z.string().nullable().optional(),
});

export const completeOpenOrderSchema = z
  .object({
    businessId: z.string().uuid(),
    discountAmount: z.coerce.number().nonnegative().default(0),
    payment: paymentLineSchema.optional(),
    payments: z.array(paymentLineSchema).min(1).optional(),
    attributedStaffId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (d) => {
      const hasSingle = d.payment != null;
      const hasMulti = Boolean(d.payments && d.payments.length > 0);
      return (hasSingle && !hasMulti) || (!hasSingle && hasMulti);
    },
    { message: "Provide exactly one of payment or payments", path: ["payment"] }
  );

export const appointmentCreateSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  staffId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().nullable().optional(),
});

export const appointmentPatchSchema = z.object({
  businessId: z.string().uuid(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  staffId: z.string().uuid().nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const loyaltyAdjustSchema = z.object({
  businessId: z.string().uuid(),
  redeemPoints: z.coerce.number().nonnegative().optional(),
  addCredit: z.coerce.number().optional(),
  note: z.string().nullable().optional(),
});

export const purchaseCreateSchema = z.object({
  businessId: z.string().uuid(),
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitCost: z.coerce.number().nonnegative(),
      })
    )
    .min(1),
});
