-- ============================================================================
-- ERP SYSTEM DATABASE SCHEMA
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- GLOBAL TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- MODULE: AUTH & ROLES
-- ============================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 5. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- view, create, edit, delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_name, action)
);

-- 6. Role Permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 7. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7b. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- MODULE: STORE / INVENTORY
-- ============================================================================

-- 8. Item Categories
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Items
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES item_categories(id) ON DELETE SET NULL,
    reorder_level NUMERIC(15, 4) DEFAULT 0.0000,
    current_stock NUMERIC(15, 4) DEFAULT 0.0000,
    item_type VARCHAR(50) DEFAULT 'Raw Material',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: SALES
-- ============================================================================

-- 10. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(15),
    credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Sent, Accepted, Declined, Expired
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty NUMERIC(15, 4) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(15, 2) DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) UNIQUE NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Completed, Cancelled
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty NUMERIC(15, 4) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Unpaid', -- Unpaid, Partially Paid, Paid, Voided
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL, -- Cash, Bank Transfer, Card, UPI
    reference_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: PURCHASE
-- ============================================================================

-- 17. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(15),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no VARCHAR(100) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Ordered, Completed, Cancelled
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    approval_status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty NUMERIC(15, 4) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Vendor Invoices
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Unpaid', -- Unpaid, Paid, Partially Paid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: INVENTORY / GRN / STOCK TRANSACTIONS
-- ============================================================================

-- 21. Stock Transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('IN', 'OUT')),
    qty NUMERIC(15, 4) NOT NULL,
    reference_type VARCHAR(100), -- GRN, Material Consumption, Work Order, Return
    reference_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Goods Receipt Note (GRN)
CREATE TABLE IF NOT EXISTS grn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_no VARCHAR(100) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. GRN Items
CREATE TABLE IF NOT EXISTS grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID REFERENCES grn(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    ordered_qty NUMERIC(15, 4) NOT NULL,
    received_qty NUMERIC(15, 4) NOT NULL,
    rejected_qty NUMERIC(15, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: PRODUCTION
-- ============================================================================

-- 24. Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finished_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. BOM Items
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID REFERENCES bom(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty_required NUMERIC(15, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_no VARCHAR(100) UNIQUE NOT NULL,
    bom_id UUID REFERENCES bom(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    planned_qty NUMERIC(15, 4) NOT NULL,
    produced_qty NUMERIC(15, 4) DEFAULT 0.0000,
    planned_start DATE,
    planned_end DATE,
    actual_start DATE,
    actual_end DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, QA Hold, Completed, Cancelled
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Material Consumption
CREATE TABLE IF NOT EXISTS material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty_issued NUMERIC(15, 4) NOT NULL,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Production Costs
CREATE TABLE IF NOT EXISTS production_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    material_cost NUMERIC(15, 2) DEFAULT 0.00,
    labor_cost NUMERIC(15, 2) DEFAULT 0.00,
    overhead_cost NUMERIC(15, 2) DEFAULT 0.00,
    total_cost NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: MAINTENANCE
-- ============================================================================

-- 29. Assets
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    asset_code VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(255),
    purchase_date DATE,
    purchase_value NUMERIC(15, 2),
    status VARCHAR(50) DEFAULT 'Active', -- Active, Maintenance, Under Repair, Disposed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. Maintenance Schedules
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    frequency VARCHAR(50) NOT NULL, -- Daily, Weekly, Monthly, Quarterly, Annually
    next_due_date DATE NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. Maintenance Logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Completed', -- Completed, Pending, Incomplete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. Issue Logs (Maintenance tickets)
CREATE TABLE IF NOT EXISTS issue_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High, Critical
    status VARCHAR(50) DEFAULT 'Open', -- Open, In Progress, Resolved, Closed
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: QA (QUALITY ASSURANCE)
-- ============================================================================

-- 33. QA Checklists
CREATE TABLE IF NOT EXISTS qa_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 34. QA Checklist Items
CREATE TABLE IF NOT EXISTS qa_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES qa_checklists(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    expected_value VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 35. QA Tests
CREATE TABLE IF NOT EXISTS qa_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    checklist_id UUID REFERENCES qa_checklists(id) ON DELETE SET NULL,
    tested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result VARCHAR(50) DEFAULT 'Pending', -- Pending, Pass, Fail
    notes TEXT,
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 36. QA Test Results
CREATE TABLE IF NOT EXISTS qa_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES qa_tests(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES qa_checklist_items(id) ON DELETE CASCADE,
    actual_value VARCHAR(255),
    passed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 37. QA Reports
CREATE TABLE IF NOT EXISTS qa_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES qa_tests(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. QA Approvals
CREATE TABLE IF NOT EXISTS qa_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES qa_tests(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- Approved, Rejected
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: QC (QUALITY CONTROL)
-- ============================================================================

-- 39. QC Raw Material
CREATE TABLE IF NOT EXISTS qc_raw_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID REFERENCES grn(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result VARCHAR(50) NOT NULL, -- Approved, Rejected
    rejection_qty NUMERIC(15, 4) DEFAULT 0.0000,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 40. QC In-Process
CREATE TABLE IF NOT EXISTS qc_in_process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result VARCHAR(50) NOT NULL, -- Approved, Rejected, Rework
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 41. QC Final Product
CREATE TABLE IF NOT EXISTS qc_final (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result VARCHAR(50) NOT NULL, -- Approved, Rejected, Hold
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 42. Non-Conformance Reports (NCR)
CREATE TABLE IF NOT EXISTS ncr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ncr_no VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- raw, in_process, final
    source_id UUID NOT NULL, -- references respective qc table ID
    defect_description TEXT NOT NULL,
    root_cause TEXT,
    corrective_action TEXT,
    raised_by UUID REFERENCES users(id) ON DELETE SET NULL,
    raised_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Open', -- Open, In Analysis, Action Taken, Closed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: DISPATCH
-- ============================================================================

-- 43. Packing Slips
CREATE TABLE IF NOT EXISTS packing_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_slip_no VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    packed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    packed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 44. Packing Slip Items
CREATE TABLE IF NOT EXISTS packing_slip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_slip_id UUID REFERENCES packing_slips(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    qty NUMERIC(15, 4) NOT NULL,
    batch_no VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 45. Delivery Challans
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_no VARCHAR(100) UNIQUE NOT NULL,
    packing_slip_id UUID REFERENCES packing_slips(id) ON DELETE SET NULL,
    order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Dispatched, Delivered, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 46. Transport Details
CREATE TABLE IF NOT EXISTS transport_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_id UUID REFERENCES delivery_challans(id) ON DELETE CASCADE,
    transporter_name VARCHAR(255) NOT NULL,
    vehicle_no VARCHAR(50) NOT NULL,
    lr_number VARCHAR(100),
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 47. Proof of Delivery (POD)
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challan_id UUID REFERENCES delivery_challans(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by VARCHAR(255) NOT NULL,
    file_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: HR
-- ============================================================================

-- 48. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    designation VARCHAR(100) NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 49. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL, -- Present, Absent, Half Day, Leave
    check_in TIME,
    check_out TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 50. Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    days_allowed_per_year INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 51. Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE SET NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 52. Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    total_days INT NOT NULL,
    used_days INT DEFAULT 0,
    remaining_days INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- 53. Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    trainer VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, Ongoing, Completed, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 54. Training Attendance Table
CREATE TABLE IF NOT EXISTS training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Assigned', -- Assigned, Completed, Absent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, employee_id)
);

-- ============================================================================
-- MODULE: DESIGN
-- ============================================================================

-- 55. Design Files Table
CREATE TABLE IF NOT EXISTS design_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    project_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 56. Design Versions (Revision History)
CREATE TABLE IF NOT EXISTS design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_file_id UUID REFERENCES design_files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 57. Design Tasks Table
CREATE TABLE IF NOT EXISTS design_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, In Review, Completed
    design_file_id UUID REFERENCES design_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 58. Design Reviews
CREATE TABLE IF NOT EXISTS design_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_file_id UUID REFERENCES design_files(id) ON DELETE CASCADE,
    version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- Approved, Changes Requested
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 59. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTO-UPDATE UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_role_permissions_updated_at BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_activity_logs_updated_at BEFORE UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_item_categories_updated_at BEFORE UPDATE ON item_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_quotation_items_updated_at BEFORE UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_sales_order_items_updated_at BEFORE UPDATE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_vendor_invoices_updated_at BEFORE UPDATE ON vendor_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_stock_transactions_updated_at BEFORE UPDATE ON stock_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_grn_updated_at BEFORE UPDATE ON grn FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_grn_items_updated_at BEFORE UPDATE ON grn_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_bom_updated_at BEFORE UPDATE ON bom FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_bom_items_updated_at BEFORE UPDATE ON bom_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_material_consumption_updated_at BEFORE UPDATE ON material_consumption FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_production_costs_updated_at BEFORE UPDATE ON production_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_maintenance_logs_updated_at BEFORE UPDATE ON maintenance_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_issue_logs_updated_at BEFORE UPDATE ON issue_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_checklists_updated_at BEFORE UPDATE ON qa_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_checklist_items_updated_at BEFORE UPDATE ON qa_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_tests_updated_at BEFORE UPDATE ON qa_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_test_results_updated_at BEFORE UPDATE ON qa_test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_reports_updated_at BEFORE UPDATE ON qa_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qa_approvals_updated_at BEFORE UPDATE ON qa_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qc_raw_material_updated_at BEFORE UPDATE ON qc_raw_material FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qc_in_process_updated_at BEFORE UPDATE ON qc_in_process FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_qc_final_updated_at BEFORE UPDATE ON qc_final FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_ncr_updated_at BEFORE UPDATE ON ncr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_packing_slips_updated_at BEFORE UPDATE ON packing_slips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_packing_slip_items_updated_at BEFORE UPDATE ON packing_slip_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_delivery_challans_updated_at BEFORE UPDATE ON delivery_challans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_transport_details_updated_at BEFORE UPDATE ON transport_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_proof_of_delivery_updated_at BEFORE UPDATE ON proof_of_delivery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_leave_types_updated_at BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_leave_applications_updated_at BEFORE UPDATE ON leave_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_leave_balances_updated_at BEFORE UPDATE ON leave_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_training_sessions_updated_at BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_training_attendance_updated_at BEFORE UPDATE ON training_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_design_files_updated_at BEFORE UPDATE ON design_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_design_versions_updated_at BEFORE UPDATE ON design_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_design_tasks_updated_at BEFORE UPDATE ON design_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_design_reviews_updated_at BEFORE UPDATE ON design_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Foreign Key Indexes for Auth & Roles
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Foreign Key Indexes for Sales
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_item_id ON quotation_items(item_id);
CREATE INDEX idx_sales_orders_quotation_id ON sales_orders(quotation_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_order_items_order_id ON sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_item_id ON sales_order_items(item_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Foreign Key Indexes for Purchase
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_approved_by ON purchase_orders(approved_by);
CREATE INDEX idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_item_id ON purchase_order_items(item_id);
CREATE INDEX idx_vendor_invoices_po_id ON vendor_invoices(po_id);
CREATE INDEX idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);

-- Foreign Key Indexes for Inventory
CREATE INDEX idx_stock_transactions_item_id ON stock_transactions(item_id);
CREATE INDEX idx_stock_transactions_created_by ON stock_transactions(created_by);
CREATE INDEX idx_grn_po_id ON grn(po_id);
CREATE INDEX idx_grn_received_by ON grn(received_by);
CREATE INDEX idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX idx_grn_items_item_id ON grn_items(item_id);

-- Foreign Key Indexes for Production
CREATE INDEX idx_bom_finished_item_id ON bom(finished_item_id);
CREATE INDEX idx_bom_items_bom_id ON bom_items(bom_id);
CREATE INDEX idx_bom_items_raw_material_id ON bom_items(raw_material_id);
CREATE INDEX idx_work_orders_bom_id ON work_orders(bom_id);
CREATE INDEX idx_work_orders_sales_order_id ON work_orders(sales_order_id);
CREATE INDEX idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX idx_material_consumption_work_order_id ON material_consumption(work_order_id);
CREATE INDEX idx_material_consumption_item_id ON material_consumption(item_id);
CREATE INDEX idx_material_consumption_issued_by ON material_consumption(issued_by);
CREATE INDEX idx_production_costs_work_order_id ON production_costs(work_order_id);

-- Foreign Key Indexes for Maintenance
CREATE INDEX idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX idx_maintenance_schedules_assigned_to ON maintenance_schedules(assigned_to);
CREATE INDEX idx_maintenance_logs_asset_id ON maintenance_logs(asset_id);
CREATE INDEX idx_maintenance_logs_schedule_id ON maintenance_logs(schedule_id);
CREATE INDEX idx_maintenance_logs_performed_by ON maintenance_logs(performed_by);
CREATE INDEX idx_issue_logs_asset_id ON issue_logs(asset_id);
CREATE INDEX idx_issue_logs_reported_by ON issue_logs(reported_by);
CREATE INDEX idx_issue_logs_assigned_to ON issue_logs(assigned_to);

-- Foreign Key Indexes for QA
CREATE INDEX idx_qa_checklist_items_checklist_id ON qa_checklist_items(checklist_id);
CREATE INDEX idx_qa_tests_work_order_id ON qa_tests(work_order_id);
CREATE INDEX idx_qa_tests_checklist_id ON qa_tests(checklist_id);
CREATE INDEX idx_qa_tests_tested_by ON qa_tests(tested_by);
CREATE INDEX idx_qa_test_results_test_id ON qa_test_results(test_id);
CREATE INDEX idx_qa_test_results_checklist_item_id ON qa_test_results(checklist_item_id);
CREATE INDEX idx_qa_reports_test_id ON qa_reports(test_id);
CREATE INDEX idx_qa_approvals_test_id ON qa_approvals(test_id);
CREATE INDEX idx_qa_approvals_approved_by ON qa_approvals(approved_by);

-- Foreign Key Indexes for QC
CREATE INDEX idx_qc_raw_material_grn_id ON qc_raw_material(grn_id);
CREATE INDEX idx_qc_raw_material_item_id ON qc_raw_material(item_id);
CREATE INDEX idx_qc_raw_material_inspected_by ON qc_raw_material(inspected_by);
CREATE INDEX idx_qc_in_process_work_order_id ON qc_in_process(work_order_id);
CREATE INDEX idx_qc_in_process_inspected_by ON qc_in_process(inspected_by);
CREATE INDEX idx_qc_final_work_order_id ON qc_final(work_order_id);
CREATE INDEX idx_qc_final_inspected_by ON qc_final(inspected_by);
CREATE INDEX idx_ncr_raised_by ON ncr(raised_by);
CREATE INDEX idx_ncr_source_id ON ncr(source_id);

-- Foreign Key Indexes for Dispatch
CREATE INDEX idx_packing_slips_order_id ON packing_slips(order_id);
CREATE INDEX idx_packing_slips_packed_by ON packing_slips(packed_by);
CREATE INDEX idx_packing_slip_items_packing_slip_id ON packing_slip_items(packing_slip_id);
CREATE INDEX idx_packing_slip_items_item_id ON packing_slip_items(item_id);
CREATE INDEX idx_delivery_challans_packing_slip_id ON delivery_challans(packing_slip_id);
CREATE INDEX idx_delivery_challans_order_id ON delivery_challans(order_id);
CREATE INDEX idx_transport_details_challan_id ON transport_details(challan_id);
CREATE INDEX idx_proof_of_delivery_challan_id ON proof_of_delivery(challan_id);

-- Foreign Key Indexes for HR
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_leave_applications_employee_id ON leave_applications(employee_id);
CREATE INDEX idx_leave_applications_leave_type_id ON leave_applications(leave_type_id);
CREATE INDEX idx_leave_applications_approved_by ON leave_applications(approved_by);
CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_leave_type_id ON leave_balances(leave_type_id);
CREATE INDEX idx_training_attendance_session_id ON training_attendance(session_id);
CREATE INDEX idx_training_attendance_employee_id ON training_attendance(employee_id);

-- Foreign Key Indexes for Design
CREATE INDEX idx_design_files_uploaded_by ON design_files(uploaded_by);
CREATE INDEX idx_design_versions_design_file_id ON design_versions(design_file_id);
CREATE INDEX idx_design_versions_uploaded_by ON design_versions(uploaded_by);
CREATE INDEX idx_design_tasks_assigned_to ON design_tasks(assigned_to);
CREATE INDEX idx_design_tasks_design_file_id ON design_tasks(design_file_id);
CREATE INDEX idx_design_reviews_design_file_id ON design_reviews(design_file_id);
CREATE INDEX idx_design_reviews_version_id ON design_reviews(version_id);
CREATE INDEX idx_design_reviews_reviewed_by ON design_reviews(reviewed_by);

-- Performance Indexes (Searched Fields)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_approval_status ON purchase_orders(approval_status);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_stock_transactions_date ON stock_transactions(date);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- 1. Seed Departments
INSERT INTO departments (name) VALUES
('Sales'),
('Production'),
('HR')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Default Roles
INSERT INTO roles (name) VALUES
('Admin'),
('Manager'),
('Staff')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Admin User
-- Email: admin@erp.com
-- Password: admin123 (bcrypt hash: $2a$12$R9h/lIPzNgb.O7IQEqbpK.2E9tWb.X42/8.b3L8fS8tK07D1E/u0e)
INSERT INTO users (id, name, email, password_hash, is_active, department_id) VALUES
('f1111111-1111-1111-1111-111111111111', 'System Administrator', 'admin@erp.com', '$2a$12$R9h/lIPzNgb.O7IQEqbpK.2E9tWb.X42/8.b3L8fS8tK07D1E/u0e', TRUE, 'd3333333-3333-3333-3333-333333333333');

-- Link Admin user to Admin role
INSERT INTO user_roles (user_id, role_id) VALUES
('f1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111');

-- 4. Seed Permissions
INSERT INTO permissions (module_name, action) VALUES
-- Auth & Roles
('auth', 'view'), ('auth', 'create'), ('auth', 'edit'), ('auth', 'delete'),
-- Sales
('sales', 'view'), ('sales', 'create'), ('sales', 'edit'), ('sales', 'delete'),
-- Purchase
('purchase', 'view'), ('purchase', 'create'), ('purchase', 'edit'), ('purchase', 'delete'),
-- Store / Inventory
('inventory', 'view'), ('inventory', 'create'), ('inventory', 'edit'), ('inventory', 'delete'),
-- Production
('production', 'view'), ('production', 'create'), ('production', 'edit'), ('production', 'delete'),
-- Maintenance
('maintenance', 'view'), ('maintenance', 'create'), ('maintenance', 'edit'), ('maintenance', 'delete'),
-- QA
('qa', 'view'), ('qa', 'create'), ('qa', 'edit'), ('qa', 'delete'),
-- QC
('qc', 'view'), ('qc', 'create'), ('qc', 'edit'), ('qc', 'delete'),
-- Dispatch
('dispatch', 'view'), ('dispatch', 'create'), ('dispatch', 'edit'), ('dispatch', 'delete'),
-- HR
('hr', 'view'), ('hr', 'create'), ('hr', 'edit'), ('hr', 'delete'),
-- Design
('design', 'view'), ('design', 'create'), ('design', 'edit'), ('design', 'delete'), ('design', 'review'),
-- Dashboard
('dashboard', 'view');

-- Link all permissions to the Admin Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a1111111-1111-1111-1111-111111111111', id FROM permissions;


-- 5. Seed Item Categories
INSERT INTO item_categories (name) VALUES
('Raw Materials'),
('Finished Goods'),
('Packaging'),
('Consumables'),
('Spare Parts');
