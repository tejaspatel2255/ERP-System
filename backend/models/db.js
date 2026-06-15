import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create the connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Auto-run migrations for Sales Module document numbers
pool.query(`
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_no VARCHAR(100) UNIQUE;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(100) UNIQUE;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100) UNIQUE;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  
  -- Purchase Module columns
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_no VARCHAR(100) UNIQUE;
  ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

  -- Store / GRN Module columns
  ALTER TABLE grn ADD COLUMN IF NOT EXISTS grn_no VARCHAR(100) UNIQUE;

  -- Production Module columns
  ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'Raw Material';
  ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS wo_no VARCHAR(100) UNIQUE;

  -- Maintenance / QA / QC / NCR columns
  ALTER TABLE ncr ADD COLUMN IF NOT EXISTS ncr_no VARCHAR(100) UNIQUE;
  ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
  ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approved_by UUID;
  ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approval_remarks TEXT;

  -- Dispatch Module columns
  ALTER TABLE packing_slips ADD COLUMN IF NOT EXISTS packing_slip_no VARCHAR(100) UNIQUE;
  ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS challan_no VARCHAR(100) UNIQUE;

  -- Settings table (key-value store for company info, print templates, etc.)
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

`).then(() => {
  console.log('Database schema alterations checked and applied successfully.');
}).catch((err) => {
  console.error('Failed to run sales schema migrations on startup:', err.message);
});

/**
 * Execute database queries
 * @param {string} text - SQL Query Text
 * @param {Array} params - Parameterized Query Values
 * @returns {Promise<Object>} Pg query results
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn('Slow database query detected:', {
        text,
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }
    
    return res;
  } catch (error) {
    console.error('Database query execution failed:', { text, error: error.message });
    throw error;
  }
};

export { pool };
export default { query, pool };
