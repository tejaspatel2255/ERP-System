import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { pool } = await import('../models/db.js');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');

  console.log('====================================================');
  console.log('  INITIALIZING DATABASE SCHEMA');
  console.log('====================================================\n');

  const client = await pool.connect();
  try {
    console.log('Applying schema.sql...');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('✔ Database schema applied successfully!');
  } catch (err) {
    console.error('✖ Database initialization failed:', err.message || err);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
