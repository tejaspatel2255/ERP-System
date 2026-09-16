ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);