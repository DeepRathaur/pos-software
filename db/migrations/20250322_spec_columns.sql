-- Spec alignment: item media & service fields, customer credit, staff commission, KOT line notes, payment line status.
-- Safe to run on existing DBs (IF NOT EXISTS).

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
