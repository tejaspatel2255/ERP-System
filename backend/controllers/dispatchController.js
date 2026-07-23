import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { uploadToSupabase } from '../middleware/upload.js';
import { generateDocNumber } from '../utils/generateDocNumber.js';
const db = { query: dbQuery, pool };

// GET /api/dispatch/packing-slips
export const getPackingSlips = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT ps.*, so.order_no AS sales_order_no, c.name AS customer_name, u.name AS packed_by_name,
             (SELECT COUNT(*)::int FROM packing_slip_items psi WHERE psi.packing_slip_id = ps.id) AS items_count
      FROM packing_slips ps
      LEFT JOIN sales_orders so ON ps.order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON ps.packed_by = u.id
      ORDER BY ps.created_at DESC
    `);
    return res.status(200).json({ success: true, packingSlips: result.rows });
  } catch (e) { next(e); }
};

// POST /api/dispatch/packing-slips
export const createPackingSlip = async (req, res, next) => {
  const { order_id, items, notes } = req.body;
  if (!order_id || !items?.length) {
    return res.status(400).json({ success: false, message: 'order_id and items are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Prerequisite check: final QC must be passed for the linked Work Order(s) (if applicable)
    const wosRes = await client.query(`SELECT id, wo_no FROM work_orders WHERE sales_order_id = $1`, [order_id]);
    if (wosRes.rows.length > 0) {
      const woIds = wosRes.rows.map(w => w.id);
      const qcRes = await client.query(`
        SELECT work_order_id, result 
        FROM qc_final 
        WHERE work_order_id = ANY($1) AND result = 'Approved'
      `, [woIds]);

      const approvedWoIds = new Set(qcRes.rows.map(q => q.work_order_id));
      const notApprovedWos = wosRes.rows.filter(w => !approvedWoIds.has(w.id));

      if (notApprovedWos.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot dispatch: Linked Work Order(s) [${notApprovedWos.map(w => w.wo_no).join(', ')}] have not passed final QC inspection.`
        });
      }
    }

    // 2. Check quantity to pack (cannot exceed remaining)
    for (const item of items) {
      const qtyToPack = parseFloat(item.qty);
      if (qtyToPack <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Pack quantity must be greater than zero.' });
      }

      // Get total ordered qty
      const orderItemRes = await client.query(`
        SELECT qty FROM sales_order_items WHERE order_id = $1 AND item_id = $2
      `, [order_id, item.item_id]);

      if (orderItemRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Item not found in Sales Order.' });
      }

      const orderedQty = parseFloat(orderItemRes.rows[0].qty);

      // Get already packed qty
      const alreadyPackedRes = await client.query(`
        SELECT COALESCE(SUM(psi.qty), 0)::float AS total_packed
        FROM packing_slip_items psi
        JOIN packing_slips ps ON psi.packing_slip_id = ps.id
        WHERE ps.order_id = $1 AND psi.item_id = $2
      `, [order_id, item.item_id]);

      const alreadyPacked = parseFloat(alreadyPackedRes.rows[0].total_packed);
      const remaining = orderedQty - alreadyPacked;

      if (qtyToPack > remaining) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Requested pack quantity (${qtyToPack}) exceeds remaining quantity to dispatch (${remaining}) for this item.`
        });
      }
    }

    // 3. Create packing slip
    const psNo = await generateDocNumber(client, 'PS');
    const psRes = await client.query(`
      INSERT INTO packing_slips (order_id, packed_by, notes, packing_slip_no)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [order_id, req.user.id, notes || null, psNo]);
    const psId = psRes.rows[0].id;

    // 4. Create packing slip items
    for (const item of items) {
      await client.query(`
        INSERT INTO packing_slip_items (packing_slip_id, item_id, qty, batch_no)
        VALUES ($1, $2, $3, $4)
      `, [psId, item.item_id, parseFloat(item.qty), item.batch_no || null]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_PACKING_SLIP', 'dispatch', psId, req);

    return res.status(201).json({ success: true, packingSlip: psRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// GET /api/dispatch/packing-slips/:id
export const getPackingSlipById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const psRes = await db.query(`
      SELECT ps.*, so.order_no AS sales_order_no, c.name AS customer_name, c.email AS customer_email,
             c.address AS customer_address, c.gstin AS customer_gstin, u.name AS packed_by_name
      FROM packing_slips ps
      LEFT JOIN sales_orders so ON ps.order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON ps.packed_by = u.id
      WHERE ps.id = $1
    `, [id]);

    if (psRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Packing slip not found.' });
    }

    const itemsRes = await db.query(`
      SELECT psi.*, i.name AS item_name, i.item_code, i.unit
      FROM packing_slip_items psi
      LEFT JOIN items i ON psi.item_id = i.id
      WHERE psi.packing_slip_id = $1
    `, [id]);

    return res.status(200).json({ success: true, packingSlip: psRes.rows[0], items: itemsRes.rows });
  } catch (e) { next(e); }
};

// GET /api/dispatch/challans
export const getChallans = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT dc.*, ps.packing_slip_no, so.order_no AS sales_order_no, c.name AS customer_name,
             td.transporter_name, td.vehicle_no, td.lr_number, td.dispatch_date,
             pod.delivered_at, pod.received_by, pod.file_url AS pod_file_url
      FROM delivery_challans dc
      LEFT JOIN packing_slips ps ON dc.packing_slip_id = ps.id
      LEFT JOIN sales_orders so ON dc.order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN transport_details td ON td.challan_id = dc.id
      LEFT JOIN proof_of_delivery pod ON pod.challan_id = dc.id
      ORDER BY dc.created_at DESC
    `);
    return res.status(200).json({ success: true, challans: result.rows });
  } catch (e) { next(e); }
};

// POST /api/dispatch/challans
export const createChallan = async (req, res, next) => {
  const { packing_slip_id } = req.body;
  if (!packing_slip_id) {
    return res.status(400).json({ success: false, message: 'packing_slip_id is required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const psRes = await client.query(`SELECT order_id FROM packing_slips WHERE id = $1`, [packing_slip_id]);
    if (psRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Packing slip not found.' });
    }
    const orderId = psRes.rows[0].order_id;

    // Check if challan already exists for this packing slip
    const existing = await client.query(`SELECT id FROM delivery_challans WHERE packing_slip_id = $1`, [packing_slip_id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Challan already exists for this Packing Slip.' });
    }

    const dcNo = await generateDocNumber(client, 'DC');
    const dcRes = await client.query(`
      INSERT INTO delivery_challans (packing_slip_id, order_id, challan_date, status, challan_no)
      VALUES ($1, $2, CURRENT_DATE, 'Draft', $3) RETURNING *
    `, [packing_slip_id, orderId, dcNo]);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_CHALLAN', 'dispatch', dcRes.rows[0].id, req);

    return res.status(201).json({ success: true, challan: dcRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// GET /api/dispatch/challans/:id
export const getChallanById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const dcRes = await db.query(`
      SELECT dc.*, ps.packing_slip_no, so.order_no AS sales_order_no, c.name AS customer_name,
             c.email AS customer_email, c.address AS customer_address, c.gstin AS customer_gstin
      FROM delivery_challans dc
      LEFT JOIN packing_slips ps ON dc.packing_slip_id = ps.id
      LEFT JOIN sales_orders so ON dc.order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE dc.id = $1
    `, [id]);

    if (dcRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery challan not found.' });
    }

    const itemsRes = await db.query(`
      SELECT psi.*, i.name AS item_name, i.item_code, i.unit
      FROM packing_slip_items psi
      JOIN delivery_challans dc ON psi.packing_slip_id = dc.packing_slip_id
      LEFT JOIN items i ON psi.item_id = i.id
      WHERE dc.id = $1
    `, [id]);

    const transportRes = await db.query(`
      SELECT * FROM transport_details WHERE challan_id = $1
    `, [id]);

    const podRes = await db.query(`
      SELECT * FROM proof_of_delivery WHERE challan_id = $1
    `, [id]);

    return res.status(200).json({
      success: true,
      challan: dcRes.rows[0],
      items: itemsRes.rows,
      transport: transportRes.rows[0] || null,
      pod: podRes.rows[0] || null
    });
  } catch (e) { next(e); }
};

// POST /api/dispatch/challans/:id/transport
export const addTransportDetails = async (req, res, next) => {
  const { id } = req.params;
  const { transporter_name, vehicle_no, lr_number, dispatch_date } = req.body;

  if (!transporter_name || !vehicle_no) {
    return res.status(400).json({ success: false, message: 'transporter_name and vehicle_no are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const transportDate = dispatch_date || new Date().toISOString().slice(0, 10);
    const existingTransport = await client.query(
      `SELECT id FROM transport_details WHERE challan_id = $1`,
      [id]
    );

    if (existingTransport.rows.length > 0) {
      await client.query(`
        UPDATE transport_details
        SET transporter_name = $1, vehicle_no = $2, lr_number = $3, dispatch_date = $4, updated_at = NOW()
        WHERE challan_id = $5
      `, [transporter_name, vehicle_no, lr_number || null, transportDate, id]);
    } else {
      await client.query(`
        INSERT INTO transport_details (challan_id, transporter_name, vehicle_no, lr_number, dispatch_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, transporter_name, vehicle_no, lr_number || null, transportDate]);
    }

    // Update challan status to Dispatched
    await client.query(`
      UPDATE delivery_challans SET status = 'Dispatched', updated_at = NOW() WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'ADD_TRANSPORT_DETAILS', 'dispatch', id, req);

    return res.status(200).json({ success: true, message: 'Transport details updated and Challan status set to Dispatched.' });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// POST /api/dispatch/challans/:id/pod
export const uploadPOD = async (req, res, next) => {
  const { id } = req.params;
  const { delivered_at, received_by, notes } = req.body;

  if (!received_by) {
    return res.status(400).json({ success: false, message: 'received_by is required.' });
  }

  let fileUrl = '';
  if (req.file) {
    try {
      fileUrl = await uploadToSupabase('proof-of-delivery', req.file);
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to upload proof of delivery file.' });
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add proof of delivery record
    await client.query(`
      INSERT INTO proof_of_delivery (challan_id, delivered_at, received_by, file_url, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, delivered_at || new Date(), received_by, fileUrl || null, notes || null]);

    // 2. Update Challan status to Delivered
    const dcRes = await client.query(`
      UPDATE delivery_challans SET status = 'Delivered', updated_at = NOW() WHERE id = $1 RETURNING order_id
    `, [id]);

    const orderId = dcRes.rows[0]?.order_id;

    // 3. Update Sales Order status to 'Delivered'
    if (orderId) {
      await client.query(`
        UPDATE sales_orders SET status = 'Delivered', updated_at = NOW() WHERE id = $1
      `, [orderId]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'UPLOAD_POD', 'dispatch', id, req);

    return res.status(200).json({ success: true, message: 'Proof of Delivery uploaded successfully.' });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// GET /api/dispatch/schedule
export const getDispatchSchedule = async (req, res, next) => {
  try {
    // Return packing slips / challans scheduled for today / this week
    const result = await db.query(`
      SELECT dc.*, ps.packing_slip_no, so.order_no AS sales_order_no, c.name AS customer_name,
             td.transporter_name, td.vehicle_no, td.dispatch_date
      FROM delivery_challans dc
      LEFT JOIN packing_slips ps ON dc.packing_slip_id = ps.id
      LEFT JOIN sales_orders so ON dc.order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN transport_details td ON td.challan_id = dc.id
      WHERE td.dispatch_date BETWEEN CURRENT_DATE - INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY td.dispatch_date ASC
    `);
    return res.status(200).json({ success: true, schedule: result.rows });
  } catch (e) { next(e); }
};
