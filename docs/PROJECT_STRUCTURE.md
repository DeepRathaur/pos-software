# Project structure

Production-oriented layout for the Next.js POS / business management app.

```text
billing-software/
├── db/
│   ├── schema.sql                 # Full PostgreSQL DDL (source of truth)
│   ├── migrations/                # Incremental ALTERs for existing databases
│   ├── dashboard-metrics.sql      # Reference SQL for analytics
│   └── README.md
├── docs/
│   ├── ARCHITECTURE.md            # Layers, errors, modules
│   └── PROJECT_STRUCTURE.md       # This file
├── public/
├── scripts/                       # postinstall helpers (e.g. sql-wasm)
├── src/
│   ├── app/
│   │   ├── (auth)/                # login, register
│   │   ├── (app)/                 # Authenticated shell: dashboard, POS, products, …
│   │   ├── api/                   # Next.js Route Handlers (REST)
│   │   │   ├── auth/
│   │   │   ├── business/
│   │   │   ├── categories/        # Product categories
│   │   │   ├── customers/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── items/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── purchases/         # Stock-in + supplier linkage
│   │   │   ├── reports/
│   │   │   ├── staff/
│   │   │   └── suppliers/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── application/               # Use-cases (checkout, dashboard metrics, purchases)
│   ├── components/                # UI (KPI cards, POS cart, charts, layout)
│   ├── config/                    # Server env
│   ├── hooks/                     # React Query hooks, debounce, etc.
│   ├── infrastructure/            # DB pool, auth, HTTP route errors
│   ├── lib/                       # Legacy re-exports + offline/sqlite sync
│   ├── shared/
│   │   ├── api/                   # Browser apiFetch + ApiError
│   │   ├── domain/                # getEnabledModules / module keys
│   │   ├── kernel/http.ts         # HttpError, parseJson, jsonOk
│   │   ├── navigation/            # Bottom nav by module
│   │   └── validation/schemas.ts
│   └── stores/                    # Zustand (auth, business, cart)
├── package.json
└── tsconfig.json
```

## Feature toggling

- **`getEnabledModules(businessType)`** — `src/shared/domain/business-modules.ts`
- Persisted on **`businesses.enabled_modules`**; merged with implicit POS modules (e.g. billing for salon/restaurant).

## Item abstraction

- **`items`** table: `kind` ∈ `product`, `service`, `menu_item`, `recipe_component`
- POS and checkout operate on **item ids**; inventory transactions are the only stock movements for tracked products.

## Key flows

| Flow | Location |
|------|----------|
| Checkout (tax, discount, split payment) | `application/orders/checkout-order.service.ts`, `POST /api/orders` |
| Stock-in from supplier | `application/purchases/record-purchase.service.ts`, `POST /api/purchases` |
| Dashboard KPIs | `application/dashboard/dashboard-metrics.service.ts`, `GET /api/dashboard` |
