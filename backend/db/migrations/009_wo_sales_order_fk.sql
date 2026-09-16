-- Migration 009: Work Orders to Sales Orders FK constraint

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_sales_order_id_fkey,
  ADD CONSTRAINT work_orders_sales_order_id_fkey
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
