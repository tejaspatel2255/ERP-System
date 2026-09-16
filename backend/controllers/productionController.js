import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { generateDocNumber } from '../utils/generateDocNumber.js';
const db = { query: dbQuery, pool };

// BOM
export const getBOMs = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT b.id, b.version, b.is_active, b.notes, b.created_at, b.updated_at,
             i.name AS finished_item_name, i.item_code AS finished_item_code
      FROM bom b LEFT JOIN items i ON b.finished_item_id = i.id
      ORDER BY i.name ASC, CAST(b.version AS INTEGER) DESC
    `);
    return res.status(200).json({ success: true, boms: result.rows });
  } catch (e) { next(e); }
};

export const createBOM = async (req, res, next) => {
  const { finished_item_id, notes, items, is_active } = req.body;
  if (!finished_item_id || !items?.length) return res.status(400).json({ success: false, message: 'finished_item_id and at least 1 raw material required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const vRes = await client.query(`SELECT COALESCE(MAX(CAST(version AS INTEGER)), 0)::int AS mv FROM bom WHERE finished_item_id = $1`, [finished_item_id]);
    const nextVer = (vRes.rows[0].mv || 0) + 1;
    if (is_active) await client.query(`UPDATE bom SET is_active = FALSE WHERE finished_item_id = $1`, [finished_item_id]);
    const bomRes = await client.query(`INSERT INTO bom (finished_item_id, version, is_active, notes) VALUES ($1,$2,$3,$4) RETURNING *`, [finished_item_id, String(nextVer), is_active || false, notes]);
    const bomId = bomRes.rows[0].id;
    for (const item of items) await client.query(`INSERT INTO bom_items (bom_id, raw_material_id, qty_required, unit) VALUES ($1,$2,$3,$4)`, [bomId, item.raw_material_id, parseFloat(item.qty_required), item.unit]);
    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_BOM', 'production', bomId, req);
    return res.status(201).json({ success: true, bom: bomRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const getBOMById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const bomRes = await db.query(`SELECT b.*, i.name AS finished_item_name, i.item_code AS finished_item_code, i.unit AS finished_item_unit FROM bom b LEFT JOIN items i ON b.finished_item_id = i.id WHERE b.id = $1`, [id]);
    if (!bomRes.rows.length) return res.status(404).json({ success: false, message: 'BOM not found.' });
    const itemsRes = await db.query(`SELECT bi.*, i.name AS material_name, i.item_code, i.current_stock FROM bom_items bi LEFT JOIN items i ON bi.raw_material_id = i.id WHERE bi.bom_id = $1`, [id]);
    return res.status(200).json({ success: true, bom: bomRes.rows[0], items: itemsRes.rows });
  } catch (e) { next(e); }
};

export const updateBOM = async (req, res, next) => {
  const { id } = req.params;
  const { notes, items, is_active } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const woCheck = await client.query(`SELECT COUNT(*)::int AS cnt FROM work_orders WHERE bom_id = $1 AND status NOT IN ('Completed','Cancelled')`, [id]);
    const bomRes = await client.query(`SELECT * FROM bom WHERE id = $1`, [id]);
    if (!bomRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'BOM not found.' }); }
    const existing = bomRes.rows[0];
    if (woCheck.rows[0].cnt > 0) {
      const vRes = await client.query(`SELECT COALESCE(MAX(CAST(version AS INTEGER)), 0)::int AS mv FROM bom WHERE finished_item_id = $1`, [existing.finished_item_id]);
      const nextVer = (vRes.rows[0].mv || 0) + 1;
      if (is_active) await client.query(`UPDATE bom SET is_active = FALSE WHERE finished_item_id = $1`, [existing.finished_item_id]);
      const newBom = await client.query(`INSERT INTO bom (finished_item_id, version, is_active, notes) VALUES ($1,$2,$3,$4) RETURNING *`, [existing.finished_item_id, String(nextVer), is_active || false, notes]);
      for (const item of (items || [])) await client.query(`INSERT INTO bom_items (bom_id, raw_material_id, qty_required, unit) VALUES ($1,$2,$3,$4)`, [newBom.rows[0].id, item.raw_material_id, parseFloat(item.qty_required), item.unit]);
      await client.query('COMMIT');
      return res.status(200).json({ success: true, message: 'New BOM version created (active WOs exist).', bom: newBom.rows[0] });
    }
    if (is_active) await client.query(`UPDATE bom SET is_active = FALSE WHERE finished_item_id = $1 AND id != $2`, [existing.finished_item_id, id]);
    await client.query(`UPDATE bom SET notes = $1, is_active = $2, updated_at = NOW() WHERE id = $3`, [notes, is_active || false, id]);
    if (items?.length) {
      await client.query(`DELETE FROM bom_items WHERE bom_id = $1`, [id]);
      for (const item of items) await client.query(`INSERT INTO bom_items (bom_id, raw_material_id, qty_required, unit) VALUES ($1,$2,$3,$4)`, [id, item.raw_material_id, parseFloat(item.qty_required), item.unit]);
    }
    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'BOM updated.' });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const activateBOM = async (req, res, next) => {
  const { id } = req.params;
  try {
    const bomRes = await db.query(`SELECT * FROM bom WHERE id = $1`, [id]);
    if (!bomRes.rows.length) return res.status(404).json({ success: false, message: 'BOM not found.' });
    await db.query(`UPDATE bom SET is_active = FALSE WHERE finished_item_id = $1`, [bomRes.rows[0].finished_item_id]);
    await db.query(`UPDATE bom SET is_active = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
    await logActivity(req.user.id, 'ACTIVATE_BOM', 'production', id, req);
    return res.status(200).json({ success: true, message: 'BOM version activated.' });
  } catch (e) { next(e); }
};

// WORK ORDERS
export const getWorkOrders = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const params = []; const wc = [];
    if (status) { params.push(status); wc.push(`wo.status = $${params.length}`); }
    if (startDate) { params.push(startDate); wc.push(`wo.planned_start >= $${params.length}::date`); }
    if (endDate) { params.push(endDate); wc.push(`wo.planned_start <= $${params.length}::date`); }
    const where = wc.length ? `WHERE ${wc.join(' AND ')}` : '';
    const result = await db.query(`
      SELECT wo.id, wo.wo_no, wo.planned_qty, wo.produced_qty, wo.planned_start, wo.planned_end,
             wo.actual_start, wo.actual_end, wo.status, wo.created_at,
             i.name AS finished_item_name, i.item_code AS finished_item_code, b.version AS bom_version,
             so.order_no AS sales_order_no
      FROM work_orders wo
      LEFT JOIN bom b ON wo.bom_id = b.id LEFT JOIN items i ON b.finished_item_id = i.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
      ${where} ORDER BY wo.planned_start ASC, wo.created_at DESC
    `, params);
    return res.status(200).json({ success: true, workOrders: result.rows });
  } catch (e) { next(e); }
};

export const createWorkOrder = async (req, res, next) => {
  const { bom_id, sales_order_id, asset_id, planned_qty, planned_start, planned_end } = req.body;
  if (!bom_id || !planned_qty || planned_qty <= 0) return res.status(400).json({ success: false, message: 'bom_id and planned_qty > 0 required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    let assetWarning = null;
    if (asset_id) {
      const assetRes = await client.query(`SELECT name, status FROM assets WHERE id = $1`, [asset_id]);
      if (assetRes.rows.length > 0) {
        const asset = assetRes.rows[0];
        if (['Under Repair', 'Maintenance'].includes(asset.status)) {
          assetWarning = `Warning: Machine/Asset "${asset.name}" is currently ${asset.status}.`;
        }
      }
    }

    const woNo = await generateDocNumber(client, 'WO');
    const bomItemsRes = await client.query(`
      SELECT bi.raw_material_id, bi.qty_required, bi.unit, i.name AS material_name, i.item_code, i.current_stock
      FROM bom_items bi LEFT JOIN items i ON bi.raw_material_id = i.id WHERE bi.bom_id = $1
    `, [bom_id]);
    const materialPlan = bomItemsRes.rows.map(m => {
      const required = parseFloat(m.qty_required) * parseFloat(planned_qty);
      const available = parseFloat(m.current_stock);
      return { item_id: m.raw_material_id, material_name: m.material_name, item_code: m.item_code, unit: m.unit, required_qty: required, available_qty: available, shortage: Math.max(0, required - available), status: available >= required ? 'OK' : 'Shortage' };
    });
    const woRes = await client.query(`
      INSERT INTO work_orders (wo_no, bom_id, sales_order_id, asset_id, planned_qty, planned_start, planned_end, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending',$8) RETURNING *
    `, [woNo, bom_id, sales_order_id || null, asset_id || null, planned_qty, planned_start || null, planned_end || null, req.user.id]);
    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_WORK_ORDER', 'production', woRes.rows[0].id, req);
    return res.status(201).json({ success: true, workOrder: woRes.rows[0], materialPlan, hasShortages: materialPlan.some(m => m.status === 'Shortage'), warning: assetWarning });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const getWorkOrderById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const woRes = await db.query(`
      SELECT wo.*, b.version AS bom_version, i.name AS finished_item_name, i.item_code AS finished_item_code,
             i.unit AS finished_item_unit, so.order_no AS sales_order_no, u.name AS created_by_name
      FROM work_orders wo LEFT JOIN bom b ON wo.bom_id = b.id LEFT JOIN items i ON b.finished_item_id = i.id
      LEFT JOIN sales_orders so ON wo.sales_order_id = so.id LEFT JOIN users u ON wo.created_by = u.id WHERE wo.id = $1
    `, [id]);
    if (!woRes.rows.length) return res.status(404).json({ success: false, message: 'Work Order not found.' });
    const wo = woRes.rows[0];
    const planRes = await db.query(`
      SELECT bi.raw_material_id AS item_id, bi.qty_required, bi.unit, i.name AS material_name, i.item_code, i.current_stock,
             (bi.qty_required * $2) AS total_required,
             COALESCE((SELECT SUM(mc.qty_issued) FROM material_consumption mc WHERE mc.work_order_id = $1 AND mc.item_id = bi.raw_material_id), 0) AS total_issued
      FROM bom_items bi LEFT JOIN items i ON bi.raw_material_id = i.id WHERE bi.bom_id = $3
    `, [id, wo.planned_qty, wo.bom_id]);
    const consumptionRes = await db.query(`
      SELECT mc.id, mc.qty_issued, mc.issued_at, i.name AS material_name, i.item_code, i.unit, u.name AS issued_by
      FROM material_consumption mc LEFT JOIN items i ON mc.item_id = i.id LEFT JOIN users u ON mc.issued_by = u.id
      WHERE mc.work_order_id = $1 ORDER BY mc.issued_at DESC
    `, [id]);
    const costRes = await db.query(`SELECT * FROM production_costs WHERE work_order_id = $1`, [id]);
    return res.status(200).json({ success: true, workOrder: wo, materialPlan: planRes.rows, consumption: consumptionRes.rows, costing: costRes.rows[0] || null });
  } catch (e) { next(e); }
};

export const startWorkOrder = async (req, res, next) => {
  const { id } = req.params;
  try {
    const check = await db.query(`SELECT status FROM work_orders WHERE id = $1`, [id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: 'WO not found.' });
    if (['Completed', 'Cancelled'].includes(check.rows[0].status)) return res.status(400).json({ success: false, message: `Cannot start a ${check.rows[0].status} WO.` });
    const result = await db.query(`UPDATE work_orders SET status = 'In Progress', actual_start = CURRENT_DATE, updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
    await logActivity(req.user.id, 'START_WORK_ORDER', 'production', id, req);
    return res.status(200).json({ success: true, workOrder: result.rows[0] });
  } catch (e) { next(e); }
};

export const completeWorkOrder = async (req, res, next) => {
  const { id } = req.params;
  const { produced_qty } = req.body;
  if (!produced_qty || parseFloat(produced_qty) <= 0) return res.status(400).json({ success: false, message: 'produced_qty > 0 required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const woRes = await client.query(`SELECT * FROM work_orders WHERE id = $1`, [id]);
    if (!woRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'WO not found.' }); }
    const wo = woRes.rows[0];
    // Update work order status and wo_qc_status to Pending inspection
    await client.query(`
      UPDATE work_orders
      SET status = 'Completed', wo_qc_status = 'Pending', actual_end = CURRENT_DATE, produced_qty = $1, updated_at = NOW()
      WHERE id = $2
    `, [parseFloat(produced_qty), id]);

    // Auto-create pending qc_final record if one does not already exist
    const existingQc = await client.query(`SELECT id FROM qc_final WHERE work_order_id = $1`, [id]);
    if (existingQc.rows.length === 0) {
      await client.query(`
        INSERT INTO qc_final (work_order_id, inspected_by, inspection_date, result, notes)
        VALUES ($1, $2, CURRENT_DATE, 'Pending', $3)
      `, [id, req.user.id, `Pending final product QC approval for WO ${wo.wo_no}`]);
    }

    const matCostRes = await client.query(`
      SELECT COALESCE(SUM(mc.qty_issued * COALESCE((SELECT poi.unit_price FROM purchase_order_items poi JOIN purchase_orders po ON poi.po_id = po.id WHERE poi.item_id = mc.item_id AND po.approval_status = 'Approved' ORDER BY po.po_date DESC LIMIT 1), 0)), 0)::float AS material_cost
      FROM material_consumption mc WHERE mc.work_order_id = $1
    `, [id]);
    const materialCost = matCostRes.rows[0].material_cost;
    await client.query(`
      INSERT INTO production_costs (work_order_id, material_cost, labor_cost, overhead_cost, total_cost) VALUES ($1,$2,0,0,$2)
      ON CONFLICT (work_order_id) DO UPDATE SET material_cost = $2, total_cost = $2 + production_costs.labor_cost + production_costs.overhead_cost, updated_at = NOW()
    `, [id, materialCost]);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'COMPLETE_WORK_ORDER', 'production', id, req);
    return res.status(200).json({ success: true, message: 'Work Order completed and submitted for Final QC inspection.' });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const createWorkOrderFromSalesOrder = async (req, res, next) => {
  const { soId } = req.params;
  try {
    const soRes = await db.query(`
      SELECT so.*, c.name AS customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.id = $1
    `, [soId]);

    if (soRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales Order not found.' });
    }

    const so = soRes.rows[0];
    const itemsRes = await db.query(`
      SELECT soi.*, i.name AS item_name, i.item_code, i.unit,
             b.id AS active_bom_id, b.version AS bom_version
      FROM sales_order_items soi
      JOIN items i ON soi.item_id = i.id
      LEFT JOIN bom b ON b.finished_item_id = i.id AND b.is_active = TRUE
      WHERE soi.order_id = $1
    `, [soId]);

    const drafts = itemsRes.rows.map(item => ({
      sales_order_id: so.id,
      sales_order_no: so.order_no,
      customer_name: so.customer_name,
      finished_item_id: item.item_id,
      finished_item_name: item.item_name,
      finished_item_code: item.item_code,
      bom_id: item.active_bom_id || null,
      bom_version: item.bom_version || null,
      planned_qty: parseFloat(item.qty || 0),
      has_active_bom: !!item.active_bom_id
    }));

    return res.status(200).json({
      success: true,
      salesOrder: so,
      drafts
    });
  } catch (e) {
    next(e);
  }
};

export const cancelWorkOrder = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`UPDATE work_orders SET status = 'Cancelled', updated_at = NOW() WHERE id = $1 AND status NOT IN ('Completed','Cancelled') RETURNING *`, [id]);
    if (!result.rows.length) return res.status(400).json({ success: false, message: 'Cannot cancel this WO.' });
    await logActivity(req.user.id, 'CANCEL_WORK_ORDER', 'production', id, req);
    return res.status(200).json({ success: true, workOrder: result.rows[0] });
  } catch (e) { next(e); }
};

// MATERIAL CONSUMPTION
export const issueToWorkOrder = async (req, res, next) => {
  const { work_order_id, item_id, qty_issued } = req.body;
  if (!work_order_id || !item_id || !qty_issued || parseFloat(qty_issued) <= 0) return res.status(400).json({ success: false, message: 'work_order_id, item_id, qty_issued > 0 required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const qty = parseFloat(qty_issued);
    const woRes = await client.query(`SELECT * FROM work_orders WHERE id = $1`, [work_order_id]);
    if (!woRes.rows.length || !['Pending', 'In Progress'].includes(woRes.rows[0].status)) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'WO must be Pending or In Progress.' }); }
    const wo = woRes.rows[0];
    const planRes = await client.query(`SELECT (bi.qty_required * $1) AS total_required FROM bom_items bi WHERE bi.bom_id = $2 AND bi.raw_material_id = $3`, [wo.planned_qty, wo.bom_id, item_id]);
    const issuedRes = await client.query(`SELECT COALESCE(SUM(qty_issued), 0)::float AS total_issued FROM material_consumption WHERE work_order_id = $1 AND item_id = $2`, [work_order_id, item_id]);
    const totalRequired = parseFloat(planRes.rows[0]?.total_required || 0);
    const alreadyIssued = parseFloat(issuedRes.rows[0].total_issued);
    const remaining = totalRequired - alreadyIssued;
    if (qty > remaining && remaining > 0) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: `Issue qty (${qty}) exceeds remaining requirement (${remaining.toFixed(4)}).` }); }
    const stockRes = await client.query(`SELECT current_stock, name FROM items WHERE id = $1`, [item_id]);
    if (parseFloat(stockRes.rows[0].current_stock) < qty) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: `Insufficient stock for ${stockRes.rows[0].name}.` }); }
    await client.query(`UPDATE items SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2`, [qty, item_id]);
    await client.query(`INSERT INTO stock_transactions (item_id, transaction_type, qty, reference_type, reference_id, date, notes, created_by) VALUES ($1,'OUT',$2,'WorkOrder',$3,CURRENT_DATE,$4,$5)`, [item_id, qty, work_order_id, `Issue to ${wo.wo_no}`, req.user.id]);
    const mcRes = await client.query(`INSERT INTO material_consumption (work_order_id, item_id, qty_issued, issued_by) VALUES ($1,$2,$3,$4) RETURNING *`, [work_order_id, item_id, qty, req.user.id]);
    await client.query('COMMIT');
    await logActivity(req.user.id, 'ISSUE_TO_WO', 'production', work_order_id, req);
    return res.status(201).json({ success: true, consumption: mcRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const getConsumptionByWO = async (req, res, next) => {
  const { woId } = req.params;
  try {
    const result = await db.query(`
      SELECT mc.id, mc.qty_issued, mc.issued_at, i.name AS material_name, i.item_code, i.unit, u.name AS issued_by
      FROM material_consumption mc LEFT JOIN items i ON mc.item_id = i.id LEFT JOIN users u ON mc.issued_by = u.id
      WHERE mc.work_order_id = $1 ORDER BY mc.issued_at DESC
    `, [woId]);
    return res.status(200).json({ success: true, consumption: result.rows });
  } catch (e) { next(e); }
};

// COSTING
export const getCosting = async (req, res, next) => {
  const { woId } = req.params;
  try {
    const result = await db.query(`SELECT * FROM production_costs WHERE work_order_id = $1`, [woId]);
    return res.status(200).json({ success: true, costing: result.rows[0] || null });
  } catch (e) { next(e); }
};

export const updateCosting = async (req, res, next) => {
  const { woId } = req.params;
  const { labor_cost, overhead_cost } = req.body;
  try {
    const existing = await db.query(`SELECT * FROM production_costs WHERE work_order_id = $1`, [woId]);
    const matCost = parseFloat(existing.rows[0]?.material_cost || 0);
    const labor = parseFloat(labor_cost || 0);
    const overhead = parseFloat(overhead_cost || 0);
    const total = matCost + labor + overhead;
    const result = await db.query(`
      INSERT INTO production_costs (work_order_id, material_cost, labor_cost, overhead_cost, total_cost) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (work_order_id) DO UPDATE SET labor_cost = $3, overhead_cost = $4, total_cost = $5, updated_at = NOW() RETURNING *
    `, [woId, matCost, labor, overhead, total]);
    return res.status(200).json({ success: true, costing: result.rows[0] });
  } catch (e) { next(e); }
};
