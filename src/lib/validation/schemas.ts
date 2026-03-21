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
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().nullable().optional(),
  taxRate: z.coerce.number().nonnegative().default(0),
  trackInventory: z.boolean().default(true),
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

export const orderCheckoutSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  tableId: z.string().uuid().nullable().optional(),
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
  payment: z.object({
    method: z.enum(["cash", "upi", "card", "other"]),
    amount: z.coerce.number().positive(),
    reference: z.string().nullable().optional(),
  }),
});

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
  schedule: z.record(z.string(), z.unknown()).optional(),
});

export const staffPatchSchema = staffCreateSchema.partial().extend({
  businessId: z.string().uuid().optional(),
});
