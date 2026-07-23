import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const expectedColumns = [
  { table: 'quotations', column: 'quotation_no', migration: '001' },
  { table: 'sales_orders', column: 'order_no', migration: '001' },
  { table: 'invoices', column: 'invoice_no', migration: '001' },
  { table: 'purchase_orders', column: 'po_no', migration: '001' },
  { table: 'purchase_orders', column: 'rejection_reason', migration: '001' },
  { table: 'grn', column: 'grn_no', migration: '001' },
  { table: 'items', column: 'item_type', migration: '001' },
  { table: 'work_orders', column: 'wo_no', migration: '001' },
  { table: 'qa_tests', column: 'approval_status', migration: '001' },
  { table: 'qa_tests', column: 'approved_by', migration: '003' },
  { table: 'qa_tests', column: 'approval_remarks', migration: '003' },
  { table: 'ncr', column: 'ncr_no', migration: '001' },
  { table: 'packing_slips', column: 'packing_slip_no', migration: '001' },
  { table: 'delivery_challans', column: 'challan_no', migration: '001' },
  { table: 'customers', column: 'is_active', migration: '001' },
  { table: 'vendors', column: 'is_active', migration: '001' }
];

async function checkMigrationStatus() {
  const db = (await import('../models/db.js')).default;
  console.log('🔍 Checking Database Migration Status...\n');

  try {
    // 1. Check Columns Status
    console.log('--- Migration Columns Check ---');
    for (const item of expectedColumns) {
      const res = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [item.table, item.column]
      );
      const exists = res.rows.length > 0;
      const statusIcon = exists ? '✅ EXISTS ' : '❌ MISSING';
      console.log(`${statusIcon} | Migration ${item.migration} | Table: ${item.table.padEnd(18)} | Column: ${item.column}`);
    }

    // 2. Check users.is_active Default Value
    console.log('\n--- Migration 002: Default is_active Check ---');
    const defaultRes = await db.query(
      `SELECT column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active'`
    );
    if (defaultRes.rows.length > 0) {
      console.log(`users.is_active Default Value: ${defaultRes.rows[0].column_default}`);
    } else {
      console.log('❌ Column users.is_active not found!');
    }

    // 3. Check doc_number_sequences Table
    console.log('\n--- Migration 004: doc_number_sequences Table Check ---');
    const tableRes = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'doc_number_sequences'`
    );
    if (tableRes.rows.length > 0) {
      console.log('✅ Table doc_number_sequences EXISTS');
    } else {
      console.log('❌ Table doc_number_sequences MISSING!');
    }

    // 4. Check IT Department (Migration 005)
    console.log('\n--- Migration 005: IT Department Check ---');
    const deptRes = await db.query(
      `SELECT id, name FROM departments WHERE name = 'IT'`
    );
    if (deptRes.rows.length > 0) {
      console.log('✅ Department IT EXISTS');
    } else {
      console.log('❌ Department IT MISSING!');
    }

    console.log('\n✨ Status check complete.');
  } catch (err) {
    console.error('❌ Check failed with error:', err);
  } finally {
    process.exit(0);
  }
}

checkMigrationStatus();
