-- Apply on existing databases (idempotent). Matches additions in schema.sql.
-- Requires permission to CREATE EXTENSION pg_trgm (often superuser on first run).

CREATE INDEX IF NOT EXISTS idx_orders_business_completed_time
  ON orders (business_id, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'completed';

CREATE INDEX IF NOT EXISTS idx_items_business_name
  ON items (business_id, name ASC)
  WHERE deleted_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_sku_trgm ON items USING gin (sku gin_trgm_ops) WHERE deleted_at IS NULL AND sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_description_trgm ON items USING gin (description gin_trgm_ops) WHERE deleted_at IS NULL AND description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_business_qty
  ON inventory (business_id, quantity)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_item_active ON order_items (item_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_business_item_time
  ON inventory_transactions (business_id, item_id, created_at DESC)
  WHERE deleted_at IS NULL;

ANALYZE orders;
ANALYZE items;
ANALYZE inventory;
ANALYZE order_items;
ANALYZE inventory_transactions;
