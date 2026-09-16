-- Migration 008: QC Gate Enforcement on GRNs and Work Orders

ALTER TABLE grn_items 
  ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'Pending' 
  CHECK (qc_status IN ('Pending','Passed','Failed'));

ALTER TABLE work_orders 
  ADD COLUMN IF NOT EXISTS wo_qc_status VARCHAR(20) DEFAULT 'Pending' 
  CHECK (wo_qc_status IN ('Pending','Passed','Failed'));
