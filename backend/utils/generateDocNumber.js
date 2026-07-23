import db from '../models/db.js';

/**
 * Generate atomic sequential document number using doc_number_sequences table.
 * @param {import('pg').PoolClient | typeof db} client - DB client or pool
 * @param {string} prefix - e.g. 'QT', 'SO', 'INV', 'PO', 'GRN', 'WO', 'NCR', 'DC', 'PS'
 * @returns {Promise<string>} e.g. 'QT-202607-0001'
 */
export const generateDocNumber = async (client, prefix) => {
  const queryable = client || db;
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace('-', '');
  const docKey = `${prefix}-${yearMonth}`;

  const res = await queryable.query(`
    INSERT INTO doc_number_sequences (doc_key, last_value)
    VALUES ($1, 1)
    ON CONFLICT (doc_key) DO UPDATE SET last_value = doc_number_sequences.last_value + 1
    RETURNING last_value;
  `, [docKey]);

  const seq = String(res.rows[0].last_value).padStart(4, '0');
  return `${prefix}-${yearMonth}-${seq}`;
};

export default generateDocNumber;
