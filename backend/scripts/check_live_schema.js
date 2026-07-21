import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { query, pool } from '../models/db.js';

const targetMap = [
  { table: 'quotations', columns: ['quotation_no'] },
  { table: 'sales_orders', columns: ['order_no'] },
  { table: 'invoices', columns: ['invoice_no'] },
  { table: 'purchase_orders', columns: ['po_no', 'rejection_reason'] },
  { table: 'grn', columns: ['grn_no'] },
  { table: 'work_orders', columns: ['wo_no'] },
  { table: 'ncr', columns: ['ncr_no'] },
  { table: 'packing_slips', columns: ['packing_slip_no'] },
  { table: 'delivery_challans', columns: ['challan_no'] },
  { table: 'items', columns: ['item_type'] },
  { table: 'customers', columns: ['is_active'] },
  { table: 'vendors', columns: ['is_active'] },
  { table: 'qa_tests', columns: ['approval_status'] }
];

async function checkColumns() {
  console.log('====================================================');
  console.log('  ERP NEXUS — LIVE DB COLUMN DIAGNOSTIC (READ-ONLY)');
  console.log('====================================================\n');

  try {
    for (const item of targetMap) {
      const res = await query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = ANY($2::text[])`,
        [item.table, item.columns]
      );
      
      const foundCols = res.rows.reduce((acc, row) => {
        acc[row.column_name] = row;
        return acc;
      }, {});

      console.log(`[Table: ${item.table}]`);
      for (const col of item.columns) {
        if (foundCols[col]) {
          console.log(`  ✔ Column '${col}' EXISTS (${foundCols[col].data_type}, nullable: ${foundCols[col].is_nullable})`);
        } else {
          console.log(`  ✖ Column '${col}' MISSING`);
        }
      }
      console.log('');
    }
  } catch (err) {
    console.error('Diagnostic Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
