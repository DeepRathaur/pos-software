# Architecture

This app follows a **layered layout** suitable for a production SaaS: clear boundaries between HTTP adapters, application logic, infrastructure, and shared code.

## Layers

| Layer | Path | Responsibility |
|--------|------|----------------|
| **App (Next.js)** | `src/app/` | Routes, layouts, UI. API route handlers are thin **adapters**: parse request → call application/infrastructure → map errors to HTTP. |
| **Application** | `src/application/` | **Use cases** (e.g. `checkout-order.service.ts`, `dashboard-metrics.service.ts`). Orchestrates domain rules and DB access; no Next.js imports. |
| **Infrastructure** | `src/infrastructure/` | **Technical details**: PostgreSQL pool, JWT session helpers, membership queries. Replaceable (e.g. another DB or auth provider) without changing use cases. |
| **Shared** | `src/shared/` | **Kernel + cross-cutting**: HTTP helpers (`kernel/http`), Zod schemas (`validation`), domain concepts (`domain/business-modules`), browser API client (`api/client`), dates (`dates/utc`), navigation rules (`navigation`). |
| **Config** | `src/config/` | **Server-only** environment (`env.ts`). Not imported from client components. |

## Legacy `@/lib/*`

Existing imports like `@/lib/http` remain valid as **thin re-exports** to the layers above. New code should import from `@/shared/*`, `@/application/*`, or `@/infrastructure/*` directly.

## Data & offline

- **SQL schema**: `db/schema.sql` (source of truth for PostgreSQL). See `db/README.md` for indexing / `pg_trgm` search and how to apply `db/migrations/` on existing DBs.
- **Offline / sync**: `src/lib/offline/` stays colocated with IndexedDB + sync queue until extracted to `infrastructure/offline` if needed.

## Dependency rule of thumb

- **Application** → may use **infrastructure** and **shared**; must not import from `app/`.
- **Infrastructure** → **config** + external libs; avoid importing **application**.
- **Shared** → no **infrastructure** (keeps client bundles and tests free of server-only code, except where a module is server-only by convention).

## Errors

- **Route handlers** use `handleRouteError` (`@/infrastructure/http/route-errors`): Zod → 422, `HttpError` → chosen status + `code`, PostgreSQL `DatabaseError` → mapped status (no raw `detail` to clients), legacy `Error` messages like `"Not found"` → 404, anything else → 500 with generic message.
- **Browser** `apiFetch` parses JSON safely, maps server `{ error, code, issues }`, wraps fetch failures as `ApiError` with `status === 0` and `code === "NETWORK_ERROR"`.
