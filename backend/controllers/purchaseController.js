import db, { pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { generateDocNumber } from '../utils/generateDocNumber.js';

const PO_APPROVAL_THRESHOLD = parseFloat(process.env.PO_APPROVAL_THRESHOLD) || 10000.00;
const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/i;

// Helper to determine GRN status on a Purchase Order
const getPoGrnStatus = async (poId) => {
  const query = `
    SELECT 
      COALESCE(SUM(poi.qty), 0)::float AS ordered_qty,
      COALESCE(
        (SELECT SUM(gi.received_qty) 
         FROM grn g 
         JOIN grn_items gi ON g.id = gi.grn_id 
         WHERE g.po_id = $1), 0
      )::float AS received_qty
    FROM purchase_order_items poi
    WHERE poi.po_id = $1
  `;
  const res = await db.query(query, [poId]);
  if (res.rows.length === 0) return 'Pending';
  
  const { ordered_qty, received_qty } = res.rows[0];
  if (received_qty === 0) return 'Not Received';
  if (received_qty >= ordered_qty) return 'Fully Received';
  return 'Partially Received';
};

// ==========================================
// 1. VENDORS
// ==========================================

export const getVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const queryParams = [`%${search}%`];
    let queryText = `
      SELECT v.id, v.name, v.email, v.phone, v.address, v.gstin, v.payment_terms, v.is_active, v.created_at,
             COUNT(po.id)::int AS total_pos,
             COALESCE(SUM(po.total_amount), 0)::float AS total_spend
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id AND po.approval_status = 'Approved'
      WHERE v.is_active = TRUE
        AND (v.name ILIKE $1 OR v.email ILIKE $1)
      GROUP BY v.id, v.name, v.email, v.phone, v.address, v.gstin, v.payment_terms, v.is_active, v.created_at
    `;

    const countRes = await db.query(`SELECT COUNT(*)::int FROM (
      SELECT 1 FROM vendors WHERE is_active = TRUE AND (name ILIKE $1 OR email ILIKE $1)
    ) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    queryParams.push(limit, offset);
    queryText += ` ORDER BY v.name ASC LIMIT $2 OFFSET $3`;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      vendors: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  const { name, email, phone, address, gstin, payment_terms } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Vendor name is required.' });
  if (gstin && !GSTIN_REGEX.test(gstin)) {
    return res.status(400).json({ success: false, message: 'GSTIN format is invalid.' });
  }

  try {
    const queryText = `
      INSERT INTO vendors (name, email, phone, address, gstin, payment_terms, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `;
    const result = await db.query(queryText, [name, email, phone, address, gstin, payment_terms || 'Net 30']);
    const newVendor = result.rows[0];

    await logActivity(req.user.id, 'CREATE_VENDOR', 'purchase', newVendor.id, req);

    return res.status(201).json({ success: true, vendor: newVendor });
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const vendorRes = await db.query(`SELECT * FROM vendors WHERE id = $1`, [id]);
    if (vendorRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Fetch PO history
    const pos = await db.query(`
      SELECT id, po_no, po_date, status, approval_status, total_amount 
      FROM purchase_orders 
      WHERE vendor_id = $1 
      ORDER BY po_date DESC
    `, [id]);

    // Fetch Vendor Invoices history
    const invoices = await db.query(`
      SELECT id, invoice_no, invoice_date, amount, status 
      FROM vendor_invoices 
      WHERE vendor_id = $1 
      ORDER BY invoice_date DESC
    `, [id]);

    // Calculate Outstanding amount (unpaid invoices)
    const unpaidRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0)::float AS unpaid 
      FROM vendor_invoices 
      WHERE vendor_id = $1 AND status != 'Paid'
    `, [id]);

    return res.status(200).json({
      success: true,
      vendor: vendorRes.rows[0],
      history: {
        pos: pos.rows,
        invoices: invoices.rows,
        outstanding: unpaidRes.rows[0].unpaid
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, gstin, payment_terms, is_active } = req.body;

  try {
    const queryText = `
      UPDATE vendors
      SET name = $1, email = $2, phone = $3, address = $4, gstin = $5, payment_terms = $6, is_active = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const result = await db.query(queryText, [name, email, phone, address, gstin, payment_terms, is_active !== undefined ? is_active : true, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vendor not found.' });

    await logActivity(req.user.id, 'UPDATE_VENDOR', 'purchase', id, req);

    return res.status(200).json({ success: true, vendor: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteVendor = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`UPDATE vendors SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vendor not found.' });

    await logActivity(req.user.id, 'DEACTIVATE_VENDOR', 'purchase', id, req);

    return res.status(200).json({ success: true, message: 'Vendor soft-deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. PURCHASE ORDERS
// ==========================================

export const getPurchaseOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { status, vendorId, startDate, endDate } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (status) {
      queryParams.push(status);
      whereClauses.push(`po.status = $${queryParams.length}`);
    }
    if (vendorId) {
      queryParams.push(vendorId);
      whereClauses.push(`po.vendor_id = $${queryParams.length}`);
    }
    if (startDate) {
      queryParams.push(startDate);
      whereClauses.push(`po.po_date >= $${queryParams.length}::date`);
    }
    if (endDate) {
      queryParams.push(endDate);
      whereClauses.push(`po.po_date <= $${queryParams.length}::date`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let queryText = `
      SELECT po.id, po.po_no, po.po_date, po.expected_date, po.status, po.total_amount, po.approval_status, po.rejection_reason,
             v.name AS vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      ${whereStr}
    `;

    const countRes = await db.query(`SELECT COUNT(*)::int FROM (${queryText}) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    queryParams.push(limit, offset);
    queryText += ` ORDER BY po.po_date DESC, po.created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await db.query(queryText, queryParams);

    // Append GRN status dynamically
    const poList = [];
    for (const row of result.rows) {
      const grnStatus = await getPoGrnStatus(row.id);
      poList.push({ ...row, grnStatus });
    }

    return res.status(200).json({
      success: true,
      orders: poList,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req, res, next) => {
  const { vendor_id, expected_date, items, notes } = req.body;

  if (!vendor_id || !expected_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Required fields: vendor_id, expected_date, and items.' });
  }

  for (const item of items) {
    const qty = Number(item.qty);
    const price = Number(item.unit_price);
    if (!item.item_id || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Purchase order items must have quantity greater than zero.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Purchase order items must have a non-negative unit price.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const poNo = await generateDocNumber(client, 'PO');

    // Calculate totals server-side
    let grandTotal = 0.00;
    const computedItems = items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const lineTotal = qty * price;
      grandTotal += lineTotal;

      return { item_id: item.item_id, qty, unit_price: price, line_total: lineTotal };
    });

    // Insert PO
    const insertPoText = `
      INSERT INTO purchase_orders (po_no, vendor_id, po_date, expected_date, status, total_amount, approval_status)
      VALUES ($1, $2, CURRENT_DATE, $3, 'Draft', $4, 'Pending')
      RETURNING *
    `;
    const poResult = await client.query(insertPoText, [poNo, vendor_id, expected_date, grandTotal]);
    const newPO = poResult.rows[0];

    // Insert items
    for (const item of computedItems) {
      await client.query(`
        INSERT INTO purchase_order_items (po_id, item_id, qty, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
      `, [newPO.id, item.item_id, item.qty, item.unit_price, item.line_total]);
    }

    await client.query('COMMIT');

    await logActivity(req.user.id, 'CREATE_PURCHASE_ORDER', 'purchase', newPO.id, req);

    return res.status(201).json({ success: true, order: newPO });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getPurchaseOrderById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const poRes = await db.query(`
      SELECT po.*, v.name AS vendor_name, v.email AS vendor_email, v.phone AS vendor_phone, v.address AS vendor_address, v.gstin AS vendor_gstin,
             u.name AS approver_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN users u ON po.approved_by = u.id
      WHERE po.id = $1
    `, [id]);

    if (poRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase Order not found.' });

    const itemsRes = await db.query(`
      SELECT poi.*, i.name AS item_name, i.item_code
      FROM purchase_order_items poi
      LEFT JOIN items i ON poi.item_id = i.id
      WHERE poi.po_id = $1
    `, [id]);

    const grnStatus = await getPoGrnStatus(id);

    return res.status(200).json({
      success: true,
      order: poRes.rows[0],
      items: itemsRes.rows,
      grnStatus
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrder = async (req, res, next) => {
  const { id } = req.params;
  const { vendor_id, expected_date, items } = req.body;

  try {
    // Verify status is Draft
    const checkRes = await db.query(`SELECT status FROM purchase_orders WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    if (checkRes.rows[0].status !== 'Draft') {
      return res.status(400).json({ success: false, message: 'Only Draft purchase orders can be updated.' });
    }

    // Recalculate totals
    let grandTotal = 0.00;
    const computedItems = items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const lineTotal = qty * price;
      grandTotal += lineTotal;

      return { item_id: item.item_id, qty, unit_price: price, line_total: lineTotal };
    });

    // Update Header
    await db.query(`
      UPDATE purchase_orders
      SET vendor_id = $1, expected_date = $2, total_amount = $3, updated_at = NOW()
      WHERE id = $4
    `, [vendor_id, expected_date, grandTotal, id]);

    // Update items
    await db.query(`DELETE FROM purchase_order_items WHERE po_id = $1`, [id]);
    for (const item of computedItems) {
      await db.query(`
        INSERT INTO purchase_order_items (po_id, item_id, qty, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, item.item_id, item.qty, item.unit_price, item.line_total]);
    }

    await logActivity(req.user.id, 'UPDATE_PURCHASE_ORDER', 'purchase', id, req);

    return res.status(200).json({ success: true, message: 'Purchase Order updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const submitPurchaseOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const poRes = await db.query(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
    if (poRes.rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found.' });
    
    const po = poRes.rows[0];
    const totalAmount = parseFloat(po.total_amount);

    let nextApproval = 'Pending';
    let nextStatus = 'Draft';

    if (totalAmount < PO_APPROVAL_THRESHOLD) {
      // Auto-approve if total is below threshold
      nextApproval = 'Approved';
      nextStatus = 'Ordered';
    } else {
      // Require approval
      nextApproval = 'Pending';
      nextStatus = 'Submitted';
    }

    const updated = await db.query(`
      UPDATE purchase_orders
      SET approval_status = $1, status = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [nextApproval, nextStatus, id]);

    await logActivity(req.user.id, 'SUBMIT_PURCHASE_ORDER', 'purchase', id, req);

    return res.status(200).json({
      success: true,
      message: totalAmount < PO_APPROVAL_THRESHOLD 
        ? 'Purchase Order auto-approved on submission (below threshold).' 
        : 'Purchase Order submitted for manager approval.',
      order: updated.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const approvePurchaseOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      UPDATE purchase_orders
      SET approval_status = 'Approved', status = 'Ordered', approved_by = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [req.user.id, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found.' });

    await logActivity(req.user.id, 'APPROVE_PURCHASE_ORDER', 'purchase', id, req);

    return res.status(200).json({ success: true, order: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const rejectPurchaseOrder = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
  }

  try {
    const result = await db.query(`
      UPDATE purchase_orders
      SET approval_status = 'Rejected', status = 'Draft', rejection_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason.trim(), id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found.' });

    await logActivity(req.user.id, 'REJECT_PURCHASE_ORDER', 'purchase', id, req);

    return res.status(200).json({ success: true, order: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // Ordered, Completed, Cancelled

  try {
    const result = await db.query(`
      UPDATE purchase_orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found.' });

    await logActivity(req.user.id, 'UPDATE_PO_STATUS', 'purchase', id, req);

    return res.status(200).json({ success: true, order: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. VENDOR INVOICES
// ==========================================

export const getVendorInvoices = async (req, res, next) => {
  try {
    const { vendorId, status } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (vendorId) {
      queryParams.push(vendorId);
      whereClauses.push(`vi.vendor_id = $${queryParams.length}`);
    }
    if (status) {
      queryParams.push(status);
      whereClauses.push(`vi.status = $${queryParams.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const queryText = `
      SELECT vi.id, vi.invoice_no, vi.invoice_date, vi.amount, vi.status,
             v.name AS vendor_name, po.po_no
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vi.po_id = po.id
      ${whereStr}
      ORDER BY vi.invoice_date DESC
    `;

    const result = await db.query(queryText, queryParams);
    return res.status(200).json({ success: true, invoices: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createVendorInvoice = async (req, res, next) => {
  const { po_id, invoice_no, invoice_date, amount } = req.body;

  if (!po_id || !invoice_no || !invoice_date || !amount) {
    return res.status(400).json({ success: false, message: 'Required fields: po_id, invoice_no, invoice_date, and amount.' });
  }

  const invoiceAmount = parseFloat(amount);
  if (invoiceAmount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });

  try {
    // 1. Fetch PO Total
    const poRes = await db.query(`SELECT total_amount, vendor_id, approval_status FROM purchase_orders WHERE id = $1`, [po_id]);
    if (poRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase Order not found.' });

    const po = poRes.rows[0];
    if (po.approval_status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Invoices can only be billed against Approved Purchase Orders.' });
    }

    const poTotal = parseFloat(po.total_amount);

    // Server Validation constraints
    // A. Cannot exceed 110% of PO total amount
    if (invoiceAmount > poTotal * 1.10) {
      return res.status(400).json({
        success: false,
        message: `Invoice amount (${formatINR(invoiceAmount)}) exceeds the PO threshold limit of 110% (${formatINR(poTotal * 1.10)}).`
      });
    }

    // B. Exceeds 105% of PO amount -> Flag warning, but accept
    let hasWarning = false;
    let warningMessage = '';
    if (invoiceAmount > poTotal * 1.05) {
      hasWarning = true;
      warningMessage = `Invoice amount exceeds Purchase Order total by more than 5%.`;
    }

    // 2. Insert Invoice
    const insertText = `
      INSERT INTO vendor_invoices (po_id, vendor_id, invoice_no, invoice_date, amount, status)
      VALUES ($1, $2, $3, $4, $5, 'Unpaid')
      RETURNING *
    `;
    const result = await db.query(insertText, [po_id, po.vendor_id, invoice_no, invoice_date, invoiceAmount]);
    const newInvoice = result.rows[0];

    await logActivity(req.user.id, 'CREATE_VENDOR_INVOICE', 'purchase', newInvoice.id, req);

    return res.status(201).json({
      success: true,
      hasWarning,
      warningMessage,
      invoice: newInvoice
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorInvoiceById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const invRes = await db.query(`
      SELECT vi.*, v.name AS vendor_name, v.gstin AS vendor_gstin, po.po_no, po.total_amount AS po_total
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      LEFT JOIN purchase_orders po ON vi.po_id = po.id
      WHERE vi.id = $1
    `, [id]);

    if (invRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });

    return res.status(200).json({ success: true, invoice: invRes.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateVendorInvoiceStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // Paid, Unpaid

  try {
    const result = await db.query(`
      UPDATE vendor_invoices
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    await logActivity(req.user.id, 'UPDATE_VENDOR_INVOICE_STATUS', 'purchase', id, req);

    return res.status(200).json({ success: true, invoice: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. ANALYTICS
// ==========================================

export const getSpendByVendor = async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const end = endDate || new Date().toISOString().slice(0, 10);

  try {
    const query = `
      SELECT v.name, COALESCE(SUM(po.total_amount), 0)::float AS value
      FROM vendors v
      JOIN purchase_orders po ON v.id = po.vendor_id
      WHERE po.approval_status = 'Approved' AND po.po_date BETWEEN $1 AND $2
      GROUP BY v.name
      ORDER BY value DESC
    `;
    const result = await db.query(query, [start, end]);
    return res.status(200).json({ success: true, report: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getSpendByItem = async (req, res, next) => {
  try {
    const query = `
      SELECT i.name, i.item_code, 
             COALESCE(SUM(poi.qty), 0)::float AS qty, 
             COALESCE(SUM(poi.line_total), 0)::float AS cost
      FROM items i
      JOIN purchase_order_items poi ON i.id = poi.item_id
      JOIN purchase_orders po ON poi.po_id = po.id
      WHERE po.approval_status = 'Approved'
      GROUP BY i.name, i.item_code
      ORDER BY cost DESC
    `;
    const result = await db.query(query);
    return res.status(200).json({ success: true, report: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getSpendByMonth = async (req, res, next) => {
  try {
    const query = `
      SELECT to_char(po_date, 'YYYY-MM') AS month, 
             COALESCE(SUM(total_amount), 0)::float AS spend
      FROM purchase_orders
      WHERE approval_status = 'Approved' AND po_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({ success: true, report: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getPendingPurchaseOrders = async (req, res, next) => {
  try {
    // Open POs past expected date, and not completed delivery
    const query = `
      SELECT po.id, po.po_no, po.expected_date, po.total_amount, v.name AS vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.approval_status = 'Approved' 
        AND po.status != 'Completed' 
        AND po.expected_date < CURRENT_DATE
      ORDER BY po.expected_date ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({ success: true, orders: result.rows });
  } catch (error) {
    next(error);
  }
};

export default {
  getVendors,
  createVendor,
  getVendorById,
  updateVendor,
  deleteVendor,
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  updatePurchaseOrderStatus,
  getVendorInvoices,
  createVendorInvoice,
  getVendorInvoiceById,
  updateVendorInvoiceStatus,
  getSpendByVendor,
  getSpendByItem,
  getSpendByMonth,
  getPendingPurchaseOrders
};
