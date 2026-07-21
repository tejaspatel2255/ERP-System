import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../db/migrations/001_add_missing_document_columns.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('====================================================');
  console.log('  RUNNING MIGRATION 001');
  console.log('====================================================\n');

  try {
    await query(sql);
    console.log('✔ Migration applied successfully!');
  } catch (err) {
    console.error('✖ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

applyMigration();
