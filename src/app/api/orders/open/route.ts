import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk, parseJson } from "@/lib/http";
import { openTabOrder } from "@/application/orders/tab-order.service";
import { openOrderSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    const body = openOrderSchema.parse(await parseJson(req));
    await assertBusinessMembership(session.sub, body.businessId);
    const order = await openTabOrder({
      businessId: body.businessId,
      userId: session.sub,
      customerId: body.customerId,
      tableId: body.tableId,
      lines: body.lines,
      notes: body.notes,
    });
    return jsonOk({ order }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
