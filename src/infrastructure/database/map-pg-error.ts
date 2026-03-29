import { DatabaseError } from "pg";

export type MappedPgError = {
  message: string;
  status: number;
  code: string;
  /** True when the raw DB message should be logged server-side but not returned to clients */
  logDetail: boolean;
};

/**
 * Maps PostgreSQL errors to HTTP-safe responses. Never forwards `detail` / internal messages to clients.
 */
export function mapPgError(err: DatabaseError): MappedPgError {
  const logDetail = true;

  switch (err.code) {
    case "23505": // unique_violation
      return {
        message: "This record already exists",
        status: 409,
        code: "UNIQUE_VIOLATION",
        logDetail,
      };
    case "23503": // foreign_key_violation
      return {
        message: "Related record was not found",
        status: 400,
        code: "FOREIGN_KEY_VIOLATION",
        logDetail,
      };
    case "23514": // check_violation
      return {
        message: "Data does not satisfy business rules",
        status: 400,
        code: "CHECK_VIOLATION",
        logDetail,
      };
    case "23502": // not_null_violation
      return {
        message: "A required field is missing",
        status: 400,
        code: "NOT_NULL_VIOLATION",
        logDetail,
      };
    case "22P02": // invalid_text_representation
      return {
        message: "Invalid data format",
        status: 400,
        code: "INVALID_INPUT",
        logDetail,
      };
    case "40P01": // deadlock_detected
    case "40001": // serialization_failure
      return {
        message: "Database is busy; please try again",
        status: 503,
        code: "TRANSIENT_DB",
        logDetail,
      };
    case "57P01": // admin_shutdown
    case "57P02": // crash_shutdown
    case "57P03": // cannot_connect_now
      return {
        message: "Database temporarily unavailable",
        status: 503,
        code: "DB_UNAVAILABLE",
        logDetail,
      };
    default:
      if (err.code?.startsWith("08")) {
        return {
          message: "Could not reach database",
          status: 503,
          code: "DB_CONNECTION",
          logDetail,
        };
      }
      return {
        message: "Something went wrong",
        status: 500,
        code: "DB_ERROR",
        logDetail,
      };
  }
}
