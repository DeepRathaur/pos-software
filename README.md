# POS Studio

Production-oriented **mobile-first POS and business management** app built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Zustand**, and **TanStack React Query**.

## Features

- **Auth** — register / login (JWT), `/api/auth/*`
- **Business profiles** — type-driven **module toggles** (`retail`, `cafe`, `salon`, `restaurant`, `custom`)
- **Generic items** — `product`, `service`, `menu_item`, `recipe_component` on one `items` table
- **Inventory** — snapshot `inventory` + append-only `inventory_transactions` (no silent quantity edits)
- **POS** — cart, discount, tax estimate, payment methods (`cash` | `upi` | `card`), transactional checkout with stock deduction
- **Customers, staff, reports** — REST handlers under `/api/*`

## Quick start

1. **Create database** and apply schema:

   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

2. **Environment** — copy `.env.example` to `.env.local` and set `DATABASE_URL` and `JWT_SECRET`.

3. **Run dev server**:

   ```bash
   npm run dev
   ```

4. Optional — seed a dev login: `npm run seed:test-user` (see [`db/README.md`](db/README.md#test-user-local-dev)).

5. Open [http://localhost:3000](http://localhost:3000) — sign in with the test user or register, create a business in **Setup**, add **Items**, optionally create **inventory** rows, then use **POS**.

## Project layout (high level)

```
billing-software/
├── db/
│   └── schema.sql                 # PostgreSQL DDL
├── src/
│   ├── app/
│   │   ├── (app)/                 # Authenticated shell (dashboard, POS, …)
│   │   ├── (auth)/                # login / register
│   │   ├── api/                   # REST route handlers
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                # KPI cards, charts, POS UI, AppShell
│   ├── hooks/queries.ts           # React Query hooks + mutations
│   ├── lib/
│   │   ├── auth.ts                # JWT (jose)
│   │   ├── db.ts                  # pg Pool
│   │   ├── feature-modules.ts     # business type → enabled_modules
│   │   ├── orders/checkout.ts     # POS transaction + inventory
│   │   └── validation/schemas.ts  # Zod
│   ├── providers/                 # React Query + hydration
│   └── stores/                    # Zustand (auth, business, cart)
└── README.md
```

## API surface

| Route | Role |
|-------|------|
| `POST /api/auth/register` | Create user + JWT |
| `POST /api/auth/login` | JWT |
| `GET /api/auth/me` | Current user (Bearer token) |
| `GET/POST /api/business` | List / create business (+ membership) |
| `GET/PATCH/DELETE /api/business/[id]` | Business CRUD (soft delete) |
| `GET/POST /api/items` | Items |
| `GET/PATCH/DELETE /api/items/[id]` | Item by id |
| `GET/POST /api/inventory` | Rows / create row + initial tx |
| `GET/POST /api/inventory/transactions` | Stock movements |
| `GET/POST /api/orders` | List / **checkout** (POS) |
| `GET/PATCH/DELETE /api/orders/[id]` | Order |
| `GET/POST /api/payments` | Payments |
| `GET/PATCH/DELETE /api/payments/[id]` | Single payment |
| `GET/POST /api/customers` | Customers |
| `GET/PATCH/DELETE /api/customers/[id]` | Customer |
| `GET/POST /api/staff` | Staff |
| `GET/PATCH/DELETE /api/staff/[id]` | Staff member |
| `GET /api/reports?type=summary|sales-by-day|top-items` | Analytics |
| `GET /api/dashboard?businessId=` | KPIs: sales/orders/profit/purchases today, top products (30d), low stock, 7‑day series |

`GET /api/dashboard` returns JSON:

```json
{
  "sales_today": 0,
  "orders_today": 0,
  "profit": 0,
  "purchases": 0,
  "top_products": [{ "item_id": "", "name": "", "units_sold": "", "revenue": "" }],
  "low_stock": [{ "item_id": "", "name": "", "quantity": "", "reorder_level": "" }],
  "sales_last_7_days": [{ "day": "ISO", "sales": "", "orders": 0 }]
}
```

`profit` uses `order_items.line_total − items.cost × quantity` for completed orders today. `purchases` sums `purchases.total` for purchase rows created today. “Today” uses **UTC** midnight boundaries (`src/lib/dates/utc.ts`). Reference SQL lives in `db/dashboard-metrics.sql`; implementation runs `src/lib/dashboard/metrics.ts`.

All mutating business-scoped routes require `Authorization: Bearer <token>` and `businessId` (body or query) where applicable.

### Example: checkout (POS)

`POST /api/orders`

```json
{
  "businessId": "uuid",
  "lines": [
    { "itemId": "uuid", "quantity": 2, "unitPrice": 99, "lineDiscount": 5 }
  ],
  "discountAmount": 10,
  "payment": { "method": "upi", "amount": 189.5 }
}
```

Server logic (`src/lib/orders/checkout.ts`) runs in a **single DB transaction** (`BEGIN` → … → `COMMIT`, `ROLLBACK` on any failure): validates items with row locks, computes subtotal/discount/tax, inserts **`orders`** + **`order_items`** + **`payments`**, then for each stocked product updates **`inventory`** and appends **`inventory_transactions`**. Errors use `HttpError` (e.g. `409` insufficient stock).

**POS UI** (`/pos`): debounced catalog search (`GET /api/items?search=`), Zustand cart (qty, line + order discounts, tax estimate via `cartSubtotal`), payment method including **other**. Checkout uses **optimistic clear** + **rollback cart on error** (`useCheckoutMutation` in `src/hooks/queries.ts`).

## Module mapping (`getEnabledModules`)

Canonical config lives in `BUSINESS_MODULE_CONFIG` in `src/lib/feature-modules.ts`. On create (and when `business_type` changes via PATCH), `enabled_modules` is set from `getEnabledModules(businessType)`.

| Business type | Modules |
|----------------|---------|
| **retail** | `products`, `inventory`, `billing` |
| **cafe** | `products`, `inventory`, `billing`, `recipes` |
| **salon** | `services`, `staff`, `appointments` (+ `billing` for POS) |
| **restaurant** | `menu`, `tables`, `kitchen_orders` (+ `billing` for POS) |
| **custom** | `products`, `inventory`, `billing`, `customers`, `reports` (tunable via PATCH) |

The UI uses `getVisibleNavItems()` (`src/lib/nav-modules.ts`) and `ModuleRouteGuard` to hide routes that are not enabled. Legacy rows may still use `kitchen` instead of `kitchen_orders`; kitchen detection accepts both.

## Offline-first POS (SQLite + sync queue)

Uses **sql.js** (SQLite in the browser), **`sync_queue`** table, and **IndexedDB** persistence. See [`docs/offline-first-architecture.md`](docs/offline-first-architecture.md).

- `saveOrderOffline()` — queue a checkout payload when offline
- `syncPendingData()` — flush pending rows to `POST /api/orders` when online
- `useOfflineSync` / `OfflineSyncListener` — auto-sync on `online` + every 60s (authenticated shell)

WASM is copied to `public/sql-wasm.wasm` on `postinstall` (`npm run copy-sql-wasm`).

## Android (Capacitor)

The `android/` project wraps the web UI. The APK loads your **deployed** Next app (API routes are not inside the APK). Set `CAPACITOR_SERVER_URL`, run `npm run android:sync`, then open `android/` in Android Studio or run `.\android\gradlew.bat assembleDebug`. Use **JDK 17 or 21** for Gradle. Details: [`docs/capacitor.md`](docs/capacitor.md).

## License

Private / your stack — adjust as needed.
