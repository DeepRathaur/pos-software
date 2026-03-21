/** @deprecated Prefer `@/shared/kernel/http` and `@/infrastructure/http/route-errors` */
export {
  HttpError,
  jsonOk,
  jsonError,
  parseJson,
} from "@/shared/kernel/http";
export { handleRouteError } from "@/infrastructure/http/route-errors";
