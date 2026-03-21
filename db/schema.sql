-- POS & Business Management — PostgreSQL schema
-- Requires PostgreSQL 13+ (gen_random_uuid in core)

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('retail', 'cafe', 'salon', 'restaurant', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE item_kind AS ENUM ('product', 'service', 'menu_item', 'recipe_component');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('draft', 'open', 'completed', 'void', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_tx_type AS ENUM (
    'sale', 'purchase', 'adjustment', 'return', 'transfer', 'initial', 'waste'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email_active ON users (email) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- BUSINESSES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  business_type    business_type NOT NULL DEFAULT 'custom',
  enabled_modules  TEXT[] NOT NULL DEFAULT '{}',
  settings         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_businesses_type ON businesses (business_type) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS business_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'owner',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_users_user ON business_users (user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users (business_id);

-- ---------------------------------------------------------------------------
-- CATEGORIES & ITEMS (generic product / service / menu)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_categories_business ON categories (business_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  kind          item_kind NOT NULL DEFAULT 'product',
  name          TEXT NOT NULL,
  sku           TEXT,
  description   TEXT,
  price         NUMERIC(14, 4) NOT NULL DEFAULT 0,
  cost          NUMERIC(14, 4),
  tax_rate      NUMERIC(8, 4) NOT NULL DEFAULT 0,
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  metadata      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_items_business ON items (business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_kind ON items (business_id, kind) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_sku ON items (business_id, sku) WHERE deleted_at IS NULL AND sku IS NOT NULL;

-- Default list sort: ORDER BY name within a business.
CREATE INDEX IF NOT EXISTS idx_items_business_name
  ON items (business_id, name ASC)
  WHERE deleted_at IS NULL;

-- ILIKE '%term%' on name / sku / description (pg_trgm).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_sku_trgm ON items USING gin (sku gin_trgm_ops) WHERE deleted_at IS NULL AND sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_description_trgm ON items USING gin (description gin_trgm_ops) WHERE deleted_at IS NULL AND description IS NOT NULL;

-- ---------------------------------------------------------------------------
-- INVENTORY (current snapshot) + TRANSACTION LOG
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity        NUMERIC(14, 4) NOT NULL DEFAULT 0,
  reorder_level   NUMERIC(14, 4) NOT NULL DEFAULT 0,
  location        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (business_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_business ON inventory (business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory (item_id);

-- Low-stock alerts: filter by business then quantity vs reorder (sequential scan helper).
CREATE INDEX IF NOT EXISTS idx_inventory_business_qty
  ON inventory (business_id, quantity)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity_delta  NUMERIC(14, 4) NOT NULL,
  tx_type         inventory_tx_type NOT NULL,
  reference_type  TEXT,
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_business_time ON inventory_transactions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON inventory_transactions (item_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_business_item_time
  ON inventory_transactions (business_id, item_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inv_tx_ref ON inventory_transactions (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  loyalty_points  NUMERIC(14, 4) NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers (business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (business_id, phone) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- ORDERS & PAYMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number      TEXT NOT NULL,
  status            order_status NOT NULL DEFAULT 'open',
  payment_status    payment_status NOT NULL DEFAULT 'unpaid',
  subtotal          NUMERIC(14, 4) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(14, 4) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(14, 4) NOT NULL DEFAULT 0,
  total             NUMERIC(14, 4) NOT NULL DEFAULT 0,
  notes             TEXT,
  table_id          UUID,
  kitchen_status    TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (business_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_business_time ON orders (business_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id) WHERE deleted_at IS NULL;

-- Dashboard / reports: almost all analytics filter status = 'completed' + created_at range.
-- Partial index keeps this index small and fast for SUM/COUNT/GROUP BY on hot paths.
CREATE INDEX IF NOT EXISTS idx_orders_business_completed_time
  ON orders (business_id, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'completed';

CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity      NUMERIC(14, 4) NOT NULL,
  unit_price    NUMERIC(14, 4) NOT NULL,
  discount      NUMERIC(14, 4) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(14, 4) NOT NULL DEFAULT 0,
  line_total    NUMERIC(14, 4) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_item_active ON order_items (item_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method        payment_method NOT NULL,
  amount        NUMERIC(14, 4) NOT NULL,
  reference     TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_time ON payments (business_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- SUPPLIERS & PURCHASES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers (business_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status          purchase_status NOT NULL DEFAULT 'draft',
  total           NUMERIC(14, 4) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchases (business_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS purchase_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id   UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity      NUMERIC(14, 4) NOT NULL,
  unit_cost     NUMERIC(14, 4) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items (purchase_id);

-- ---------------------------------------------------------------------------
-- STAFF & APPOINTMENTS (Salon)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',
  phone         TEXT,
  schedule      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_business ON staff (business_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id      UUID REFERENCES staff(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  item_id       UUID REFERENCES items(id) ON DELETE SET NULL,
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  status        appointment_status NOT NULL DEFAULT 'scheduled',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_start ON appointments (business_id, start_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments (staff_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- RESTAURANT: TABLES (optional FK from orders.table_id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  capacity      INT NOT NULL DEFAULT 4,
  status        TEXT NOT NULL DEFAULT 'free',
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_business ON restaurant_tables (business_id) WHERE deleted_at IS NULL;

DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_table
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Spec extensions (barcode, media, services, KOT, split payments, credit)
-- ---------------------------------------------------------------------------

ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS staff_required BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_items_barcode ON items (business_id, barcode) WHERE deleted_at IS NULL AND barcode IS NOT NULL;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(14, 4) NOT NULL DEFAULT 0;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(8, 4) NOT NULL DEFAULT 0;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_status TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_note TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS idx_orders_table_business ON orders (business_id, table_id) WHERE deleted_at IS NULL AND table_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Advanced modules (see db/migrations/20250323_advanced_modules.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_current_order ON restaurant_tables (current_order_id) WHERE current_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS kot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_kot_business_status ON kot (business_id, status);
CREATE INDEX IF NOT EXISTS idx_kot_order ON kot (order_id);

CREATE TABLE IF NOT EXISTS staff_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  total_services  INT NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(14, 4) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_perf_business ON staff_performance (business_id);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14, 4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  amount          NUMERIC(14, 4) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON supplier_payments (purchase_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS attributed_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Application code sets updated_at on writes; add DB triggers in production if desired.
