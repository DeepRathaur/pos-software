import { requireUser } from "@/lib/auth";
import { assertBusinessMembership } from "@/lib/business-access";
import { fetchDashboardMetrics } from "@/lib/dashboard/metrics";
import { getUtcLastNDaysRange, getUtcTodayRange } from "@/lib/dates/utc";
import { handleRouteError, jsonOk } from "@/lib/http";

/**
 * GET /api/dashboard?businessId=
 * Returns sales_today, orders_today, profit, purchases, top_products, low_stock,
 * and sales_last_7_days (for charts). All times use UTC day boundaries for "today"
 * and a rolling 7-day window for the series.
 */
export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);

    const { start: todayStart, end: todayEnd } = getUtcTodayRange();
    const { start: chartStart, end: chartEnd } = getUtcLastNDaysRange(7);

    const raw = await fetchDashboardMetrics(
      businessId,
      todayStart,
      todayEnd,
      chartStart,
      chartEnd
    );

    return jsonOk({
      sales_today: Number(raw.sales_today),
      orders_today: raw.orders_today,
      profit: Number(raw.profit),
      purchases: Number(raw.purchases),
      top_products: raw.top_products,
      low_stock: raw.low_stock,
      sales_last_7_days: raw.sales_last_7_days,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
