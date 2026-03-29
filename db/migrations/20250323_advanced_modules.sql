-- Advanced modules: table occupancy, KOT, staff performance, supplier payments, appointment billing link.

-- Restaurant tables: link active order + occupancy
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_current_order ON restaurant_tables (current_order_id) WHERE current_order_id IS NOT NULL;

-- Kitchen order tickets (one active ticket per order; re-send updates same row)
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

-- Staff rollups (refreshed from reporting / order completion)
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

-- Appointment → order when converted to bill
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Supplier payments against purchases (outstanding balance)
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

-- Optional attribution for commission rollups (POS / future use)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attributed_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
