import { query as dbQuery, pool } from '../models/db.js';

const db = { query: dbQuery, pool };

const allowedKeys = [
  'company_name',
  'company_address',
  'company_gstin',
  'company_phone',
  'company_email',
  'invoice_terms',
  'po_approval_threshold',
  'bank_name',
  'bank_account_no',
  'bank_ifsc'
];

export const getSettings = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT key, value FROM settings ORDER BY key ASC`);
    return res.status(200).json({ success: true, settings: result.rows });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const updates = Object.entries(req.body || {}).filter(([key]) => allowedKeys.includes(key));
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No valid settings provided.' });
    }

    await client.query('BEGIN');
    for (const [key, value] of updates) {
      await client.query(`
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [key, String(value ?? '')]);
    }
    await client.query('COMMIT');

    return res.status(200).json({ success: true, message: 'Settings saved successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export default { getSettings, updateSettings };
