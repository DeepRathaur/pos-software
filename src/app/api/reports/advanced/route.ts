import { assertBusinessMembership } from "@/lib/business-access";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/http";
import { fetchAdvancedReports } from "@/application/reports/advanced-reports.service";

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return Response.json({ error: "businessId is required" }, { status: 400 });
    }
    await assertBusinessMembership(session.sub, businessId);
    const data = await fetchAdvancedReports(businessId);
    return jsonOk(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
