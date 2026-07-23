import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { pool } = await import('../models/db.js');

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, '../db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log('====================================================');
  console.log('  RUNNING MIGRATIONS');
  console.log('====================================================\n');

  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`✔ ${file} applied successfully!`);
    }
  } catch (err) {
    console.error('✖ Migration failed:', err.message || err);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
