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

4. Open [http://localhost:3000](http://localhost:3000) — register, create a business in **Setup**, add **Items**, optionally create **inventory** rows, then use **POS**.

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

All mutating business-scoped routes require `Authorization: Bearer <token>` and `businessId` (body or query) where applicable.

### Example: checkout (POS)

`POST /api/orders`

```json
{
  "businessId": "uuid",
  "lines": [{ "itemId": "uuid", "quantity": 2 }],
  "discountAmount": 10,
  "payment": { "method": "upi", "amount": 189.5 }
}
```

Server recomputes totals, writes `orders`, `order_items`, `payments`, and `inventory_transactions` for stocked products.

## Module mapping

Defined in `src/lib/feature-modules.ts` — `enabled_modules` is stored on `businesses` at creation / type change.

## License

Private / your stack — adjust as needed.
