-- ============================================================================
-- MIGRATION 001: Add missing document numbers and metadata columns
-- Safe & Idempotent (uses IF NOT EXISTS)
-- ============================================================================

-- 1. Sales Module: Quotations, Sales Orders, Invoices
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_no VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100);

-- 2. Purchase Module: Purchase Orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_no VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Store / Inventory Module: Goods Receipt Note (GRN), Items
ALTER TABLE grn ADD COLUMN IF NOT EXISTS grn_no VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'Raw Material';

-- 4. Production Module: Work Orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS wo_no VARCHAR(100);

-- 5. Quality Assurance / Quality Control: QA Tests, NCR
ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE ncr ADD COLUMN IF NOT EXISTS ncr_no VARCHAR(100);

-- 6. Dispatch Module: Packing Slips, Delivery Challans
ALTER TABLE packing_slips ADD COLUMN IF NOT EXISTS packing_slip_no VARCHAR(100);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS challan_no VARCHAR(100);

-- 7. Master Tables: Customers, Vendors
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 8. Add Unique Indexes safely (Partial Unique Indexes prevent conflicts with null legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_quotation_no ON quotations(quotation_no) WHERE quotation_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_order_no ON sales_orders(order_no) WHERE order_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no) WHERE invoice_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_po_no ON purchase_orders(po_no) WHERE po_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grn_grn_no ON grn(grn_no) WHERE grn_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_wo_no ON work_orders(wo_no) WHERE wo_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ncr_ncr_no ON ncr(ncr_no) WHERE ncr_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_packing_slips_packing_slip_no ON packing_slips(packing_slip_no) WHERE packing_slip_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_challans_challan_no ON delivery_challans(challan_no) WHERE challan_no IS NOT NULL;
