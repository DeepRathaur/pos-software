import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { completeOpenOrder } from "@/application/orders/tab-order.service";
import { completeOpenOrderSchema } from "@/lib/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireUser(req);
    const { id } = await ctx.params;
    const body = completeOpenOrderSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const payments =
      body.payment != null ? [body.payment] : (body.payments ?? []);
    const order = await completeOpenOrder({
      businessId: body.businessId,
      userId: session.sub,
      orderId: id,
      discountAmount: body.discountAmount,
      payments,
      attributedStaffId: body.attributedStaffId,
    });
    return jsonOk({ order });
  } catch (err) {
    return handleRouteError(err);
  }
}
