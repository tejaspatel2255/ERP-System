-- Migration 010: Connect Work Orders to Assets

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
