import db from './models/db.js';

const runMigration = async () => {
  try {
    console.log('Running database alterations for Step 5...');
    
    // Alter tables to add document number columns
    await db.query(`
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_no VARCHAR(100) UNIQUE;
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(100) UNIQUE;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100) UNIQUE;
    `);

    console.log('Database alterations ran successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
