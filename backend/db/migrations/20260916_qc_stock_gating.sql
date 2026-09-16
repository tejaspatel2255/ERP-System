ALTER TABLE grn_items
  ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'Pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grn_items_qc_status_check'
  ) THEN
    ALTER TABLE grn_items
      ADD CONSTRAINT grn_items_qc_status_check
      CHECK (qc_status IN ('Pending', 'Passed', 'Failed'));
  END IF;
END $$;

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS wo_qc_status VARCHAR(20) DEFAULT 'Pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_orders_wo_qc_status_check'
  ) THEN
    ALTER TABLE work_orders
      ADD CONSTRAINT work_orders_wo_qc_status_check
      CHECK (wo_qc_status IN ('Pending', 'Passed', 'Failed'));
  END IF;
END $$;