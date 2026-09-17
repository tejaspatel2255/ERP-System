import db, { pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { generateDocNumber } from '../utils/generateDocNumber.js';

const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/i;

export { generateDocNumber };

// ==========================================
// 1. CUSTOMERS
// ==========================================

export const getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const queryParams = [`%${search}%`];
    let queryText = `
      SELECT id, name, email, phone, address, gstin, credit_limit, balance, is_active, created_at
      FROM customers
      WHERE is_active = TRUE
        AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)
    `;

    // Count
    const countRes = await db.query(`SELECT COUNT(*)::int FROM (${queryText}) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // Order & Pagination
    queryParams.push(limit, offset);
    queryText += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      customers: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  const { name, email, phone, address, gstin, credit_limit } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Customer name is required.' });
  // Optional GSTIN validation (allow up to 15 alphanumeric characters for demo flexibility)
  if (gstin && gstin.trim().length > 15) {
    return res.status(400).json({ success: false, message: 'GSTIN format is invalid (max 15 characters).' });
  }

  try {
    const queryText = `
      INSERT INTO customers (name, email, phone, address, gstin, credit_limit, balance, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, 0.00, TRUE)
      RETURNING *
    `;
    const result = await db.query(queryText, [name, email, phone, address, gstin, credit_limit || 0.00]);
    const newCustomer = result.rows[0];

    await logActivity(req.user.id, 'CREATE_CUSTOMER', 'sales', newCustomer.id, req);

    return res.status(201).json({ success: true, customer: newCustomer });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const customerRes = await db.query(`SELECT * FROM customers WHERE id = $1`, [id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = customerRes.rows[0];

    // Fetch quotation history
    const quotations = await db.query(
      `SELECT id, quotation_no, date, valid_until, status, total_amount FROM quotations WHERE customer_id = $1 ORDER BY date DESC`,
      [id]
    );

    // Fetch order history
    const orders = await db.query(
      `SELECT id, order_no, order_date, status, total_amount FROM sales_orders WHERE customer_id = $1 ORDER BY order_date DESC`,
      [id]
    );

    // Fetch invoice history
    const invoices = await db.query(
      `SELECT id, invoice_no, invoice_date, due_date, status, total_amount, paid_amount FROM invoices WHERE customer_id = $1 ORDER BY invoice_date DESC`,
      [id]
    );

    // Fetch payment history
    const payments = await db.query(
      `SELECT p.id, p.payment_date, p.amount, p.payment_mode, p.reference_no, p.invoice_id, inv.invoice_no
       FROM payments p
       JOIN invoices inv ON p.invoice_id = inv.id
       WHERE inv.customer_id = $1
       ORDER BY p.payment_date DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      customer,
      history: {
        quotations: quotations.rows,
        orders: orders.rows,
        invoices: invoices.rows,
        payments: payments.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, gstin, credit_limit, is_active } = req.body;

  try {
    const queryText = `
      UPDATE customers
      SET name = $1, email = $2, phone = $3, address = $4, gstin = $5, credit_limit = $6, is_active = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const result = await db.query(queryText, [name, email, phone, address, gstin, credit_limit, is_active !== undefined ? is_active : true, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' });

    await logActivity(req.user.id, 'UPDATE_CUSTOMER', 'sales', id, req);

    return res.status(200).json({ success: true, customer: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`UPDATE customers SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' });

    await logActivity(req.user.id, 'DEACTIVATE_CUSTOMER', 'sales', id, req);

    return res.status(200).json({ success: true, message: 'Customer soft-deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. QUOTATIONS
// ==========================================

export const getQuotations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { status, customerId, startDate, endDate, search } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (status) {
      queryParams.push(status);
      whereClauses.push(`q.status = $${queryParams.length}`);
    }
    if (customerId) {
      queryParams.push(customerId);
      whereClauses.push(`q.customer_id = $${queryParams.length}`);
    }
    if (startDate) {
      queryParams.push(startDate);
      whereClauses.push(`q.date >= $${queryParams.length}::date`);
    }
    if (endDate) {
      queryParams.push(endDate);
      whereClauses.push(`q.date <= $${queryParams.length}::date`);
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(q.quotation_no ILIKE $${queryParams.length} OR c.name ILIKE $${queryParams.length})`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let queryText = `
      SELECT q.id, q.quotation_no, q.date, q.valid_until, q.status, q.total_amount, q.notes,
             c.name AS customer_name, c.email AS customer_email
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      ${whereStr}
    `;

    // Count
    const countRes = await db.query(`SELECT COUNT(*)::int FROM (${queryText}) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // Sort & Paginate
    queryParams.push(limit, offset);
    queryText += ` ORDER BY q.date DESC, q.created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      quotations: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuotation = async (req, res, next) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const qRes = await client.query('SELECT status FROM quotations WHERE id = $1', [id]);
    if (!qRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    if (qRes.rows[0].status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Only Draft quotations can be deleted.' });
    }
    await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [id]);
    await client.query('DELETE FROM quotations WHERE id = $1', [id]);
    await client.query('COMMIT');
    await logActivity(req.user.id, 'DELETE_QUOTATION', 'sales', id, req);
    return res.status(200).json({ success: true, message: 'Quotation deleted successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const createQuotation = async (req, res, next) => {
  const { customer_id, date, valid_until, notes, items } = req.body;

  if (!customer_id || !valid_until || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Required fields missing: customer_id, valid_until, and items.' });
  }

  for (const item of items) {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!item.item_id || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quotation items must have quantity greater than zero.' });
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ success: false, message: 'Quotation items must have a non-negative unit price.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate Document Number
    const quotationNo = await generateDocNumber(client, 'QT');

    // 1. Calculate totals server-side
    let grandTotal = 0.00;
    const computedItems = items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const taxPct = parseFloat(item.tax_pct) || 0;

      const subtotal = qty * unitPrice;
      const afterDiscount = subtotal - discount;
      const taxAmount = afterDiscount * (taxPct / 100);
      const lineTotal = afterDiscount + taxAmount;

      grandTotal += lineTotal;

      return {
        item_id: item.item_id,
        qty,
        unit_price: unitPrice,
        discount,
        tax_pct: taxPct,
        line_total: lineTotal
      };
    });

    // 2. Insert Quotation
    const insertQuotationText = `
      INSERT INTO quotations (quotation_no, customer_id, date, valid_until, status, total_amount, notes)
      VALUES ($1, $2, $3, $4, 'Draft', $5, $6)
      RETURNING *
    `;
    const qRes = await client.query(insertQuotationText, [
      quotationNo,
      customer_id,
      date || new Date().toISOString().slice(0, 10),
      valid_until,
      grandTotal,
      notes
    ]);
    const newQuotation = qRes.rows[0];

    // 3. Insert Quotation Items
    for (const item of computedItems) {
      await client.query(`
        INSERT INTO quotation_items (quotation_id, item_id, qty, unit_price, discount, tax_pct, line_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [newQuotation.id, item.item_id, item.qty, item.unit_price, item.discount, item.tax_pct, item.line_total]);
    }

    await client.query('COMMIT');

    await logActivity(req.user.id, 'CREATE_QUOTATION', 'sales', newQuotation.id, req);

    return res.status(201).json({ success: true, quotation: newQuotation });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getQuotationById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const qRes = await db.query(`
      SELECT q.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address, c.gstin AS customer_gstin
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [id]);

    if (qRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Quotation not found.' });

    const itemsRes = await db.query(`
      SELECT qi.*, i.name AS item_name, i.item_code
      FROM quotation_items qi
      LEFT JOIN items i ON qi.item_id = i.id
      WHERE qi.quotation_id = $1
    `, [id]);

    return res.status(200).json({
      success: true,
      quotation: qRes.rows[0],
      items: itemsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotation = async (req, res, next) => {
  const { id } = req.params;
  const { customer_id, date, valid_until, notes, items } = req.body;

  try {
    // 1. Verify status is Draft
    const checkRes = await db.query(`SELECT status FROM quotations WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Quotation not found.' });
    if (checkRes.rows[0].status !== 'Draft') {
      return res.status(400).json({ success: false, message: 'Only Draft quotations can be updated.' });
    }

    // 2. Recalculate totals
    let grandTotal = 0.00;
    const computedItems = items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const taxPct = parseFloat(item.tax_pct) || 0;

      const subtotal = qty * unitPrice;
      const afterDiscount = subtotal - discount;
      const taxAmount = afterDiscount * (taxPct / 100);
      const lineTotal = afterDiscount + taxAmount;

      grandTotal += lineTotal;

      return {
        item_id: item.item_id,
        qty,
        unit_price: unitPrice,
        discount,
        tax_pct: taxPct,
        line_total: lineTotal
      };
    });

    // 3. Update Quotation Header
    await db.query(`
      UPDATE quotations
      SET customer_id = $1, date = $2, valid_until = $3, notes = $4, total_amount = $5, updated_at = NOW()
      WHERE id = $6
    `, [customer_id, date, valid_until, notes, grandTotal, id]);

    // 4. Update Items (Delete existing and insert new)
    await db.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [id]);
    for (const item of computedItems) {
      await db.query(`
        INSERT INTO quotation_items (quotation_id, item_id, qty, unit_price, discount, tax_pct, line_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, item.item_id, item.qty, item.unit_price, item.discount, item.tax_pct, item.line_total]);
    }

    await logActivity(req.user.id, 'UPDATE_QUOTATION', 'sales', id, req);

    return res.status(200).json({ success: true, message: 'Quotation updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // Draft, Sent, Approved, Rejected

  try {
    const result = await db.query(`
      UPDATE quotations
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Quotation not found.' });

    await logActivity(req.user.id, 'UPDATE_QUOTATION_STATUS', 'sales', id, req);

    return res.status(200).json({ success: true, quotation: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. SALES ORDERS
// ==========================================

export const convertQuotationToOrder = async (req, res, next) => {
  const { id } = req.params; // Quotation ID

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch quotation FOR UPDATE
    const qRes = await client.query(`SELECT * FROM quotations WHERE id = $1 FOR UPDATE`, [id]);
    if (qRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    
    const quotation = qRes.rows[0];
    if (quotation.status !== 'Approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Only Approved quotations can be converted to Sales Orders.' });
    }

    // Generate SO document number
    const orderNo = await generateDocNumber(client, 'SO');

    // 2. Insert Sales Order
    const insertSOText = `
      INSERT INTO sales_orders (quotation_id, customer_id, order_no, order_date, status, total_amount)
      VALUES ($1, $2, $3, CURRENT_DATE, 'Pending', $4)
      RETURNING *
    `;
    const soRes = await client.query(insertSOText, [id, quotation.customer_id, orderNo, quotation.total_amount]);
    const newOrder = soRes.rows[0];

    // 3. Copy items
    const qItemsRes = await client.query(`SELECT * FROM quotation_items WHERE quotation_id = $1`, [id]);
    for (const qItem of qItemsRes.rows) {
      await client.query(`
        INSERT INTO sales_order_items (order_id, item_id, qty, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
      `, [newOrder.id, qItem.item_id, qItem.qty, qItem.unit_price, qItem.line_total]);
    }

    // 4. Update Quotation Status to indicate it was converted
    await client.query(`UPDATE quotations SET status = 'Accepted', updated_at = NOW() WHERE id = $1`, [id]);

    await client.query('COMMIT');

    await logActivity(req.user.id, 'CONVERT_QUOTATION_TO_ORDER', 'sales', newOrder.id, req);

    return res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { status, customerId } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (status) {
      queryParams.push(status);
      whereClauses.push(`so.status = $${queryParams.length}`);
    }
    if (customerId) {
      queryParams.push(customerId);
      whereClauses.push(`so.customer_id = $${queryParams.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let queryText = `
      SELECT so.id, so.order_no, so.order_date, so.status, so.total_amount,
             c.name AS customer_name, q.quotation_no
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN quotations q ON so.quotation_id = q.id
      ${whereStr}
    `;

    const countRes = await db.query(`SELECT COUNT(*)::int FROM (${queryText}) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    queryParams.push(limit, offset);
    queryText += ` ORDER BY so.order_date DESC, so.created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      orders: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const orderRes = await db.query(`
      SELECT so.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address,
             q.quotation_no
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN quotations q ON so.quotation_id = q.id
      WHERE so.id = $1
    `, [id]);

    if (orderRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Sales Order not found.' });

    const itemsRes = await db.query(`
      SELECT soi.*, i.name AS item_name, i.item_code, COALESCE(i.current_stock, 0)::float AS current_stock
      FROM sales_order_items soi
      LEFT JOIN items i ON soi.item_id = i.id
      WHERE soi.order_id = $1
    `, [id]);

    const availability = itemsRes.rows.map(item => {
      const requiredQty = parseFloat(item.qty || 0);
      const availableQty = parseFloat(item.current_stock || 0);
      const shortfall = Math.max(0, requiredQty - availableQty);
      return {
        item_id: item.item_id,
        item_name: item.item_name,
        item_code: item.item_code,
        required_qty: requiredQty,
        available_qty: availableQty,
        shortfall
      };
    });

    const invoiceRes = await db.query(`
      SELECT id, invoice_no, invoice_date, due_date, status, total_amount, paid_amount 
      FROM invoices 
      WHERE order_id = $1
    `, [id]);

    return res.status(200).json({
      success: true,
      order: orderRes.rows[0],
      items: itemsRes.rows,
      availability,
      hasShortfall: availability.some(a => a.shortfall > 0),
      invoice: invoiceRes.rows[0] || null
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // Pending, Processing, Completed, Cancelled

  try {
    const result = await db.query(`
      UPDATE sales_orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });

    await logActivity(req.user.id, 'UPDATE_ORDER_STATUS', 'sales', id, req);

    return res.status(200).json({ success: true, order: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. INVOICES
// ==========================================

export const getInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { status, customerId } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (status) {
      if (status === 'Overdue') {
        whereClauses.push(`inv.due_date < CURRENT_DATE AND inv.status != 'Paid'`);
      } else {
        queryParams.push(status);
        whereClauses.push(`inv.status = $${queryParams.length}`);
      }
    }
    if (customerId) {
      queryParams.push(customerId);
      whereClauses.push(`inv.customer_id = $${queryParams.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let queryText = `
      SELECT inv.id, inv.invoice_no, inv.invoice_date, inv.due_date, inv.status, inv.total_amount, inv.paid_amount,
             (inv.total_amount - inv.paid_amount) AS outstanding_amount,
             c.name AS customer_name, so.order_no
      FROM invoices inv
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN sales_orders so ON inv.order_id = so.id
      ${whereStr}
    `;

    const countRes = await db.query(`SELECT COUNT(*)::int FROM (${queryText}) AS t`, queryParams);
    const totalCount = countRes.rows[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    queryParams.push(limit, offset);
    queryText += ` ORDER BY inv.invoice_date DESC, inv.created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      invoices: result.rows,
      pagination: { page, limit, totalCount, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoiceFromOrder = async (req, res, next) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ success: false, message: 'order_id is required.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch Order details
    const orderRes = await client.query(`SELECT * FROM sales_orders WHERE id = $1`, [order_id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales Order not found.' });
    }

    const order = orderRes.rows[0];

    // Check if invoice already exists for this order
    const existingInv = await client.query(`SELECT id FROM invoices WHERE order_id = $1`, [order_id]);
    if (existingInv.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'An invoice has already been generated for this Sales Order.' });
    }

    // Generate invoice document number
    const invoiceNo = await generateDocNumber(client, 'INV');
    
    // Set due date: today + 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // 2. Insert Invoice
    const insertText = `
      INSERT INTO invoices (order_id, customer_id, invoice_no, invoice_date, due_date, status, total_amount, paid_amount)
      VALUES ($1, $2, $3, CURRENT_DATE, $4, 'Unpaid', $5, 0.00)
      RETURNING *
    `;
    const invRes = await client.query(insertText, [order_id, order.customer_id, invoiceNo, dueDate, order.total_amount]);
    const newInvoice = invRes.rows[0];

    // 3. Update Customer Balance outstanding amount
    await client.query(`
      UPDATE customers 
      SET balance = balance + $1, updated_at = NOW() 
      WHERE id = $2
    `, [order.total_amount, order.customer_id]);

    await client.query('COMMIT');

    await logActivity(req.user.id, 'CREATE_INVOICE', 'sales', newInvoice.id, req);

    return res.status(201).json({ success: true, invoice: newInvoice });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getInvoiceById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const invRes = await db.query(`
      SELECT inv.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address, c.gstin AS customer_gstin,
             so.order_no
      FROM invoices inv
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN sales_orders so ON inv.order_id = so.id
      WHERE inv.id = $1
    `, [id]);

    if (invRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const invoice = invRes.rows[0];

    // Fetch the list of line items by joining with Sales Order Items
    const itemsRes = await db.query(`
      SELECT soi.*, i.name AS item_name, i.item_code
      FROM sales_order_items soi
      LEFT JOIN items i ON soi.item_id = i.id
      WHERE soi.order_id = $1
    `, [invoice.order_id]);

    // Fetch payment history for this invoice
    const paymentsRes = await db.query(`
      SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC
    `, [id]);

    return res.status(200).json({
      success: true,
      invoice,
      items: itemsRes.rows,
      payments: paymentsRes.rows
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // Voided, Sent etc.

  try {
    const result = await db.query(`
      UPDATE invoices
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    await logActivity(req.user.id, 'UPDATE_INVOICE_STATUS', 'sales', id, req);

    return res.status(200).json({ success: true, invoice: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PAYMENTS
// ==========================================

export const recordPayment = async (req, res, next) => {
  const { invoice_id, amount, payment_mode, reference_no, notes } = req.body;

  if (!invoice_id || !amount || !payment_mode) {
    return res.status(400).json({ success: false, message: 'Required fields: invoice_id, amount, payment_mode.' });
  }

  const payAmt = parseFloat(amount);
  if (payAmt <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. SELECT * FROM invoices WHERE id = $1 FOR UPDATE
    const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 FOR UPDATE`, [invoice_id]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    
    const invoice = invRes.rows[0];
    const totalAmount = parseFloat(invoice.total_amount);
    const prevPaid = parseFloat(invoice.paid_amount);
    
    const nextPaid = prevPaid + payAmt;
    if (nextPaid > totalAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Payment exceeds outstanding invoice amount.' });
    }
    let nextStatus = 'Partially Paid';
    if (nextPaid >= totalAmount) {
      nextStatus = 'Paid';
    }

    // 2. Insert Payment Record
    const insertPaymentText = `
      INSERT INTO payments (invoice_id, payment_date, amount, payment_mode, reference_no, notes)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
      RETURNING *
    `;
    const pRes = await client.query(insertPaymentText, [invoice_id, payAmt, payment_mode, reference_no, notes]);
    const newPayment = pRes.rows[0];

    // 3. Update Invoice Header paid amount & status
    await client.query(`
      UPDATE invoices
      SET paid_amount = $1, status = $2, updated_at = NOW()
      WHERE id = $3
    `, [nextPaid, nextStatus, invoice_id]);

    // 4. Decrease Customer outstanding balance
    await client.query(`
      UPDATE customers
      SET balance = balance - $1, updated_at = NOW()
      WHERE id = $2
    `, [payAmt, invoice.customer_id]);

    await client.query('COMMIT');

    await logActivity(req.user.id, 'RECORD_PAYMENT', 'sales', newPayment.id, req);

    return res.status(201).json({ success: true, payment: newPayment });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const queryParams = [];
    let whereClauses = [];

    if (startDate) {
      queryParams.push(startDate);
      whereClauses.push(`p.payment_date >= $${queryParams.length}::date`);
    }
    if (endDate) {
      queryParams.push(endDate);
      whereClauses.push(`p.payment_date <= $${queryParams.length}::date`);
    }
    if (mode) {
      queryParams.push(mode);
      whereClauses.push(`p.payment_mode = $${queryParams.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const queryText = `
      SELECT p.id, p.payment_date, p.amount, p.payment_mode, p.reference_no, p.notes,
             inv.invoice_no, c.name AS customer_name
      FROM payments p
      LEFT JOIN invoices inv ON p.invoice_id = inv.id
      LEFT JOIN customers c ON inv.customer_id = c.id
      ${whereStr}
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;

    const result = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      payments: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. REPORTS
// ==========================================

export const getSummaryReport = async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10); // default Jan 1st
  const end = endDate || new Date().toISOString().slice(0, 10);

  try {
    // Total Invoiced
    const invoicedRes = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0)::float AS total FROM invoices WHERE invoice_date BETWEEN $1 AND $2`,
      [start, end]
    );

    // Total Collected
    const collectedRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments WHERE payment_date BETWEEN $1 AND $2`,
      [start, end]
    );

    // Outstanding
    const outstandingRes = await db.query(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0)::float AS total FROM invoices WHERE status != 'Paid'`
    );

    // Overdue
    const overdueRes = await db.query(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0)::float AS total FROM invoices WHERE due_date < CURRENT_DATE AND status != 'Paid'`
    );

    return res.status(200).json({
      success: true,
      summary: {
        totalInvoiced: invoicedRes.rows[0].total,
        totalCollected: collectedRes.rows[0].total,
        outstanding: outstandingRes.rows[0].total,
        overdue: overdueRes.rows[0].total
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getByCustomerReport = async (req, res, next) => {
  try {
    const queryText = `
      SELECT c.id, c.name, COALESCE(SUM(inv.total_amount), 0)::float AS revenue
      FROM customers c
      JOIN invoices inv ON c.id = inv.customer_id
      WHERE inv.status IN ('Paid', 'Partially Paid')
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const result = await db.query(queryText);
    return res.status(200).json({ success: true, report: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getByMonthReport = async (req, res, next) => {
  try {
    const queryText = `
      SELECT to_char(invoice_date, 'YYYY-MM') AS month, 
             COALESCE(SUM(total_amount), 0)::float AS sales
      FROM invoices
      WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    const result = await db.query(queryText);
    return res.status(200).json({ success: true, report: result.rows });
  } catch (error) {
    next(error);
  }
};

export default {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getQuotations,
  createQuotation,
  getQuotationById,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getInvoices,
  createInvoiceFromOrder,
  getInvoiceById,
  updateInvoiceStatus,
  recordPayment,
  getPayments,
  getSummaryReport,
  getByCustomerReport,
  getByMonthReport
};
