import { DatabaseError } from "pg";
import { ZodError } from "zod";

import { mapPgError } from "@/infrastructure/database/map-pg-error";
import { HttpError, jsonError } from "@/shared/kernel/http";

const LEGACY_ERROR_STATUS: Record<string, number> = {
  Unauthorized: 401,
  Forbidden: 403,
  "Not found": 404,
  "Order not found": 404,
  "Inventory row not found for item": 404,
};

/**
 * Central API error handler: Zod, domain HttpError, PostgreSQL, legacy Error messages, unknowns.
 * Use only from Route Handlers (Node runtime).
 */
export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Validation failed", 422, {
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return jsonError(err.message, err.status, err.code ? { code: err.code } : undefined);
  }
  if (err instanceof DatabaseError) {
    const mapped = mapPgError(err);
    if (mapped.logDetail) {
      console.error("[pg]", err.code, err.message, err.detail ?? "");
    }
    return jsonError(mapped.message, mapped.status, { code: mapped.code });
  }
  if (err instanceof Error) {
    const status = LEGACY_ERROR_STATUS[err.message];
    if (status !== undefined) {
      return jsonError(err.message, status);
    }
    if (err.message === "Resulting quantity cannot be negative") {
      return jsonError(err.message, 400, { code: "NEGATIVE_QUANTITY" });
    }
    const code = "code" in err && typeof (err as NodeJS.ErrnoException).code === "string"
      ? (err as NodeJS.ErrnoException).code
      : undefined;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
      console.error("[route] db transport", code, err.message);
      return jsonError("Could not reach database", 503, { code: "DB_TRANSPORT" });
    }
    console.error("[route]", err);
    return jsonError("Internal server error", 500);
  }
  console.error("[route]", err);
  return jsonError("Internal server error", 500);
}
