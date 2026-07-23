import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, '../db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log('====================================================');
  console.log('  RUNNING MIGRATIONS');
  console.log('====================================================\n');

  try {
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await query(sql);
      console.log(`✔ ${file} applied successfully!`);
    }
  } catch (err) {
    console.error('✖ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

applyMigrations();
