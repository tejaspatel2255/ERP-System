import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
const db = { query: dbQuery, pool };

// GRN number generator — sequential count within current month
const generateGrnNo = async (prefix, table, col) => {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const countRes = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM ${table} WHERE ${col} LIKE $1`,
    [`${prefix}-${yyyymm}-%`]
  );
  const seq = String((countRes.rows[0].cnt || 0) + 1).padStart(4, '0');
  return `${prefix}-${yyyymm}-${seq}`;
};

// ==========================================
// 1. ITEM CATEGORIES
// ==========================================

export const getCategories = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM item_categories ORDER BY name ASC`);
    return res.status(200).json({ success: true, categories: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Category name is required.' });

  try {
    const result = await db.query(
      `INSERT INTO item_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *`,
      [name.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Category already exists.' });
    }
    return res.status(201).json({ success: true, category: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. ITEM MASTER
// ==========================================

export const getItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || '';

    const params = [`%${search}%`];
    let whereStr = `WHERE (i.name ILIKE $1 OR i.item_code ILIKE $1)`;

    if (categoryId) {
      params.push(categoryId);
      whereStr += ` AND i.category_id = $${params.length}`;
    }

    const countRes = await db.query(
      `SELECT COUNT(*)::int FROM items i ${whereStr}`,
      params
    );
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    params.push(limit, offset);
    const result = await db.query(`
      SELECT i.*, ic.name AS category_name
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      ${whereStr}
      ORDER BY i.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.status(200).json({
      success: true,
      items: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  const { item_code, name, description, unit, category_id, reorder_level, item_type } = req.body;
  if (!item_code?.trim() || !name?.trim() || !unit?.trim()) {
    return res.status(400).json({ success: false, message: 'item_code, name, and unit are required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO items (item_code, name, description, unit, category_id, reorder_level, current_stock, item_type)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
      RETURNING *
    `, [item_code.trim(), name.trim(), description, category_id || null, reorder_level || 0, reorder_level || 0, item_type || 'Raw Material']);

    await logActivity(req.user.id, 'CREATE_ITEM', 'store', result.rows[0].id, req);
    return res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: `Item code '${item_code}' already exists.` });
    }
    next(error);
  }
};

export const getItemById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT i.*, ic.name AS category_name
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    return res.status(200).json({ success: true, item: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  const { id } = req.params;
  const { item_code, name, description, unit, category_id, reorder_level, item_type } = req.body;

  try {
    const result = await db.query(`
      UPDATE items
      SET item_code = $1, name = $2, description = $3, unit = $4, category_id = $5, reorder_level = $6, item_type = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [item_code, name, description, unit, category_id || null, reorder_level || 0, item_type || 'Raw Material', id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });
    await logActivity(req.user.id, 'UPDATE_ITEM', 'store', id, req);
    return res.status(200).json({ success: true, item: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: `Item code '${item_code}' already exists.` });
    }
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  const { id } = req.params;
  try {
    const stockCheck = await db.query(`SELECT current_stock FROM items WHERE id = $1`, [id]);
    if (stockCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (parseFloat(stockCheck.rows[0].current_stock) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete item with existing stock. Issue or adjust stock first.' });
    }

    await db.query(`DELETE FROM items WHERE id = $1`, [id]);
    await logActivity(req.user.id, 'DELETE_ITEM', 'store', id, req);
    return res.status(200).json({ success: true, message: 'Item deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GRN (STOCK IN)
// ==========================================

export const getGRNs = async (req, res, next) => {
  try {
    const { poId, startDate, endDate } = req.query;
    const params = [];
    let whereClauses = [];

    if (poId) { params.push(poId); whereClauses.push(`g.po_id = $${params.length}`); }
    if (startDate) { params.push(startDate); whereClauses.push(`g.received_date >= $${params.length}::date`); }
    if (endDate) { params.push(endDate); whereClauses.push(`g.received_date <= $${params.length}::date`); }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT g.id, g.grn_no, g.received_date, g.notes,
             po.po_no, v.name AS vendor_name,
             COUNT(gi.id)::int AS item_count,
             u.name AS received_by_name
      FROM grn g
      LEFT JOIN purchase_orders po ON g.po_id = po.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN grn_items gi ON g.id = gi.grn_id
      LEFT JOIN users u ON g.received_by = u.id
      ${whereStr}
      GROUP BY g.id, g.grn_no, g.received_date, g.notes, po.po_no, v.name, u.name
      ORDER BY g.received_date DESC, g.created_at DESC
    `, params);

    return res.status(200).json({ success: true, grns: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createGRN = async (req, res, next) => {
  const { po_id, received_date, notes, items } = req.body;

  if (!po_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'po_id and items array are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify PO exists and is Approved
    const poRes = await client.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND approval_status = 'Approved'`,
      [po_id]
    );
    if (poRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Only Approved POs can receive goods.' });
    }

    const grnNo = await generateGrnNo('GRN', 'grn', 'grn_no');

    // Insert GRN header
    const grnRes = await client.query(`
      INSERT INTO grn (grn_no, po_id, received_date, received_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [grnNo, po_id, received_date || new Date().toISOString().slice(0, 10), req.user.id, notes]);

    const grnId = grnRes.rows[0].id;

    // Process each item
    for (const item of items) {
      const receivedQty = parseFloat(item.received_qty) || 0;
      const rejectedQty = parseFloat(item.rejected_qty) || 0;
      const orderedQty = parseFloat(item.ordered_qty) || 0;

      // Insert GRN item record with qc_status = 'Pending'
      const grnItemRes = await client.query(`
        INSERT INTO grn_items (grn_id, item_id, ordered_qty, received_qty, rejected_qty, qc_status)
        VALUES ($1, $2, $3, $4, $5, 'Pending')
        RETURNING *
      `, [grnId, item.item_id, orderedQty, receivedQty, rejectedQty]);

      // Auto-create linked qc_raw_material record per GRN item in 'Pending' status
      await client.query(`
        INSERT INTO qc_raw_material (grn_id, item_id, inspected_by, inspection_date, result, rejection_qty, notes)
        VALUES ($1, $2, $3, CURRENT_DATE, 'Pending', $4, $5)
      `, [grnId, item.item_id, req.user.id, rejectedQty, `Awaiting raw material QC inspection for GRN ${grnNo}`]);
    }

    // Recalculate PO delivery status
    const poItemsRes = await client.query(`SELECT item_id, qty FROM purchase_order_items WHERE po_id = $1`, [po_id]);
    let fullyReceived = true;
    let anyReceived = false;

    for (const poItem of poItemsRes.rows) {
      const receivedSumRes = await client.query(`
        SELECT COALESCE(SUM(gi.received_qty), 0)::float AS total_received
        FROM grn g JOIN grn_items gi ON g.id = gi.grn_id
        WHERE g.po_id = $1 AND gi.item_id = $2
      `, [po_id, poItem.item_id]);

      const totalReceived = receivedSumRes.rows[0].total_received;
      if (totalReceived > 0) anyReceived = true;
      if (totalReceived < parseFloat(poItem.qty)) fullyReceived = false;
    }

    const newPoStatus = fullyReceived ? 'Completed' : (anyReceived ? 'Partially Received' : 'Ordered');
    await client.query(`UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2`, [newPoStatus, po_id]);

    await client.query('COMMIT');

    await logActivity(req.user.id, 'CREATE_GRN', 'store', grnId, req);
    return res.status(201).json({ success: true, grn: grnRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getGRNById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const grnRes = await db.query(`
      SELECT g.*, po.po_no, v.name AS vendor_name, u.name AS received_by_name
      FROM grn g
      LEFT JOIN purchase_orders po ON g.po_id = po.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN users u ON g.received_by = u.id
      WHERE g.id = $1
    `, [id]);

    if (grnRes.rows.length === 0) return res.status(404).json({ success: false, message: 'GRN not found.' });

    const itemsRes = await db.query(`
      SELECT gi.*, i.name AS item_name, i.item_code, i.unit
      FROM grn_items gi
      LEFT JOIN items i ON gi.item_id = i.id
      WHERE gi.grn_id = $1
    `, [id]);

    return res.status(200).json({ success: true, grn: grnRes.rows[0], items: itemsRes.rows });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. STOCK ISSUE (STOCK OUT)
// ==========================================

export const issueStock = async (req, res, next) => {
  const { issue_to, reference_type, reference_id, date, notes, items } = req.body;
  // reference_type: 'WorkOrder' | 'SalesOrder' | 'Manual'

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const issueNo = `ISS-${new Date().toISOString().slice(0,7).replace('-','')}-${String(Math.floor(Math.random()*9000)+1000)}`;

    const issueDate = date || new Date().toISOString().slice(0, 10);

    for (const item of items) {
      const qty = parseFloat(item.qty);
      if (!qty || qty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Invalid qty for item ${item.item_id}.` });
      }

      // Check stock availability
      const stockRes = await client.query(`SELECT current_stock, name, item_code FROM items WHERE id = $1`, [item.item_id]);
      if (stockRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: `Item ${item.item_id} not found.` });
      }

      const currentStock = parseFloat(stockRes.rows[0].current_stock);
      if (qty > currentStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${stockRes.rows[0].name} (${stockRes.rows[0].item_code}). Available: ${currentStock}, Requested: ${qty}`
        });
      }

      // Insert stock_transaction (OUT)
      await client.query(`
        INSERT INTO stock_transactions (item_id, transaction_type, qty, reference_type, reference_id, date, notes, created_by)
        VALUES ($1, 'OUT', $2, $3, $4, $5, $6, $7)
      `, [item.item_id, qty, reference_type || 'Manual', reference_id || null, issueDate, notes || `Issue: ${issueNo}`, req.user.id]);

      // Deduct from current_stock
      await client.query(`
        UPDATE items SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2
      `, [qty, item.item_id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'ISSUE_STOCK', 'store', reference_id || null, req);

    return res.status(201).json({ success: true, message: 'Stock issued successfully.', issueNo });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getIssues = async (req, res, next) => {
  try {
    const { refType, startDate, endDate } = req.query;
    const params = [`OUT`];
    let whereStr = `WHERE st.transaction_type = $1`;

    if (refType) { params.push(refType); whereStr += ` AND st.reference_type = $${params.length}`; }
    if (startDate) { params.push(startDate); whereStr += ` AND st.date >= $${params.length}::date`; }
    if (endDate) { params.push(endDate); whereStr += ` AND st.date <= $${params.length}::date`; }

    const result = await db.query(`
      SELECT st.id, st.date, st.reference_type, st.reference_id, st.notes, st.qty,
             i.name AS item_name, i.item_code, i.unit,
             u.name AS issued_by
      FROM stock_transactions st
      LEFT JOIN items i ON st.item_id = i.id
      LEFT JOIN users u ON st.created_by = u.id
      ${whereStr}
      ORDER BY st.date DESC, st.created_at DESC
    `, params);

    return res.status(200).json({ success: true, issues: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getIssueById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT st.*, i.name AS item_name, i.item_code, i.unit, u.name AS issued_by
      FROM stock_transactions st
      LEFT JOIN items i ON st.item_id = i.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.id = $1 AND st.transaction_type = 'OUT'
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Issue record not found.' });
    return res.status(200).json({ success: true, issue: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. STOCK LEDGER (per item, running balance)
// ==========================================

export const getStockLedger = async (req, res, next) => {
  const { itemId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const params = [itemId];
    let dateFilter = '';

    if (startDate) { params.push(startDate); dateFilter += ` AND st.date >= $${params.length}::date`; }
    if (endDate) { params.push(endDate); dateFilter += ` AND st.date <= $${params.length}::date`; }

    // Window function for running balance
    const result = await db.query(`
      SELECT
        st.id,
        st.date,
        st.transaction_type,
        st.qty,
        st.reference_type,
        st.notes,
        st.created_at,
        u.name AS done_by,
        SUM(
          CASE WHEN st.transaction_type = 'IN' THEN st.qty ELSE -st.qty END
        ) OVER (ORDER BY st.date ASC, st.created_at ASC) AS running_balance
      FROM stock_transactions st
      LEFT JOIN users u ON st.created_by = u.id
      WHERE st.item_id = $1 ${dateFilter}
      ORDER BY st.date ASC, st.created_at ASC
    `, params);

    return res.status(200).json({ success: true, ledger: result.rows });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. STOCK POSITION
// ==========================================

export const getStockPosition = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT i.id, i.item_code, i.name, i.unit, i.current_stock, i.reorder_level,
             ic.name AS category_name,
             CASE
               WHEN i.current_stock <= 0 THEN 'Critical'
               WHEN i.current_stock <= i.reorder_level THEN 'Low'
               ELSE 'OK'
             END AS stock_status
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      ORDER BY i.name ASC
    `);

    return res.status(200).json({ success: true, stockPosition: result.rows });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. REORDER ALERTS
// ==========================================

export const getStockAlerts = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT i.id, i.item_code, i.name, i.unit, i.current_stock, i.reorder_level,
             ic.name AS category_name,
             (i.reorder_level - i.current_stock) AS shortage,
             CASE WHEN i.reorder_level > 0
               THEN ROUND((i.current_stock / i.reorder_level * 100)::numeric, 1)
               ELSE 0
             END AS stock_ratio_pct
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE i.current_stock <= i.reorder_level AND i.reorder_level > 0
      ORDER BY stock_ratio_pct ASC
    `);

    return res.status(200).json({ success: true, alerts: result.rows });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  createCategory,
  getItems,
  createItem,
  getItemById,
  updateItem,
  deleteItem,
  getGRNs,
  createGRN,
  getGRNById,
  issueStock,
  getIssues,
  getIssueById,
  getStockLedger,
  getStockPosition,
  getStockAlerts
};
