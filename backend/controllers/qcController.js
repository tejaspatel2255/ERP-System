import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { generateDocNumber } from '../utils/generateDocNumber.js';
const db = { query: dbQuery, pool };

// ==========================================
// 1. QC RAW MATERIAL
// ==========================================

export const getRawMaterialQC = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT qc.*, g.grn_no, i.name AS item_name, i.item_code, u.name AS inspector_name
      FROM qc_raw_material qc
      LEFT JOIN grn g ON qc.grn_id = g.id
      LEFT JOIN items i ON qc.item_id = i.id
      LEFT JOIN users u ON qc.inspected_by = u.id
      ORDER BY qc.inspection_date DESC
    `);
    return res.status(200).json({ success: true, records: result.rows });
  } catch (e) { next(e); }
};

export const createRawMaterialQC = async (req, res, next) => {
  const { grn_id, item_id, result, rejection_qty, notes } = req.body;
  if (!grn_id || !item_id || !result) return res.status(400).json({ success: false, message: 'grn_id, item_id, result required.' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rejQty = parseFloat(rejection_qty || 0);

    // Insert QC record
    const qcRes = await client.query(`
      INSERT INTO qc_raw_material (grn_id, item_id, inspected_by, inspection_date, result, rejection_qty, notes)
      VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6) RETURNING *
    `, [grn_id, item_id, req.user.id, result, rejQty, notes]);
    const qcId = qcRes.rows[0].id;

    if (result === 'Rejected' || rejQty > 0) {
      // Auto update GRN item
      await client.query(`
        UPDATE grn_items
        SET received_qty = CASE WHEN received_qty - $1 < 0 THEN 0 ELSE received_qty - $1 END,
            rejected_qty = rejected_qty + $1
        WHERE grn_id = $2 AND item_id = $3
      `, [rejQty, grn_id, item_id]);

      // Deduct stock for failed qty
      await client.query(`
        UPDATE items SET current_stock = CASE WHEN current_stock - $1 < 0 THEN 0 ELSE current_stock - $1 END, updated_at = NOW()
        WHERE id = $2
      `, [rejQty, item_id]);

      // Log stock transaction OUT for the rejected inspection qty
      await client.query(`
        INSERT INTO stock_transactions (item_id, transaction_type, qty, reference_type, reference_id, date, notes, created_by)
        VALUES ($1, 'OUT', $2, 'GRN', $3, CURRENT_DATE, $4, $5)
      `, [item_id, rejQty, grn_id, `QC Rejection from GRN`, req.user.id]);

      // Auto trigger NCR
      const ncrNo = await generateDocNumber(client, 'NCR');
      await client.query(`
        INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, status, raised_by)
        VALUES ($1, 'raw', $2, $3, 'Open', $4)
      `, [ncrNo, qcId, `QC raw material failure on Item ID ${item_id}. Notes: ${notes || 'none'}`, req.user.id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_RAW_QC', 'qc', qcId, req);
    return res.status(201).json({ success: true, record: qcRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

// ==========================================
// 2. QC IN PROCESS
// ==========================================

export const getInProcessQC = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT qc.*, wo.wo_no, u.name AS inspector_name
      FROM qc_in_process qc
      LEFT JOIN work_orders wo ON qc.work_order_id = wo.id
      LEFT JOIN users u ON qc.inspected_by = u.id
      ORDER BY qc.inspection_date DESC
    `);
    return res.status(200).json({ success: true, records: result.rows });
  } catch (e) { next(e); }
};

export const createInProcessQC = async (req, res, next) => {
  const { work_order_id, stage, result, notes } = req.body;
  if (!work_order_id || !stage || !result) return res.status(400).json({ success: false, message: 'work_order_id, stage, result required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const qcRes = await client.query(`
      INSERT INTO qc_in_process (work_order_id, stage, inspected_by, inspection_date, result, notes)
      VALUES ($1,$2,$3,CURRENT_DATE,$4,$5) RETURNING *
    `, [work_order_id, stage, req.user.id, result, notes]);
    const qcId = qcRes.rows[0].id;

    if (result === 'Rejected') {
      const ncrNo = await generateDocNumber(client, 'NCR');
      await client.query(`
        INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, status, raised_by)
        VALUES ($1, 'in_process', $2, $3, 'Open', $4)
      `, [ncrNo, qcId, `In-process stage '${stage}' failure on WO ${work_order_id}`, req.user.id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_INPROCESS_QC', 'qc', qcId, req);
    return res.status(201).json({ success: true, record: qcRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

// ==========================================
// 3. QC FINAL PRODUCT
// ==========================================

export const getFinalQC = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT qc.*, wo.wo_no, u.name AS inspector_name
      FROM qc_final qc
      LEFT JOIN work_orders wo ON qc.work_order_id = wo.id
      LEFT JOIN users u ON qc.inspected_by = u.id
      ORDER BY qc.inspection_date DESC
    `);
    return res.status(200).json({ success: true, records: result.rows });
  } catch (e) { next(e); }
};

// Approve/Process Raw Material QC
export const approveRawMaterialQC = async (req, res, next) => {
  const { id } = req.params; // qc_raw_material id or grn_item id
  const { result, notes, rejection_qty } = req.body; // result: 'Pass' | 'Fail'

  if (!result || !['Pass', 'Fail'].includes(result)) {
    return res.status(400).json({ success: false, message: "result must be 'Pass' or 'Fail'." });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch QC record or GRN item
    const qcRes = await client.query(`
      SELECT qc.*, gi.received_qty, gi.item_id, g.grn_no
      FROM qc_raw_material qc
      JOIN grn g ON qc.grn_id = g.id
      JOIN grn_items gi ON gi.grn_id = qc.grn_id AND gi.item_id = qc.item_id
      WHERE qc.id = $1 FOR UPDATE
    `, [id]);

    if (qcRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'QC record not found.' });
    }

    const qc = qcRes.rows[0];
    const passQty = parseFloat(qc.received_qty || 0);

    if (result === 'Pass') {
      // 1. Update grn_items qc_status = 'Passed'
      await client.query(`
        UPDATE grn_items SET qc_status = 'Passed', updated_at = NOW()
        WHERE grn_id = $1 AND item_id = $2
      `, [qc.grn_id, qc.item_id]);

      // 2. Update qc_raw_material record
      await client.query(`
        UPDATE qc_raw_material SET result = 'Pass', notes = $1, inspected_by = $2, inspection_date = CURRENT_DATE
        WHERE id = $3
      `, [notes || qc.notes, req.user.id, id]);

      // 3. Stock increment (stock_transactions + items.current_stock)
      if (passQty > 0) {
        await client.query(`
          INSERT INTO stock_transactions (item_id, transaction_type, qty, reference_type, reference_id, date, notes, created_by)
          VALUES ($1, 'IN', $2, 'GRN', $3, CURRENT_DATE, $4, $5)
        `, [qc.item_id, passQty, qc.grn_id, `QC Passed for GRN ${qc.grn_no}`, req.user.id]);

        await client.query(`
          UPDATE items SET current_stock = current_stock + $1, updated_at = NOW()
          WHERE id = $2
        `, [passQty, qc.item_id]);
      }
    } else {
      // Result === 'Fail'
      // 1. Update grn_items qc_status = 'Failed'
      await client.query(`
        UPDATE grn_items SET qc_status = 'Failed', updated_at = NOW()
        WHERE grn_id = $1 AND item_id = $2
      `, [qc.grn_id, qc.item_id]);

      // 2. Update qc_raw_material record
      await client.query(`
        UPDATE qc_raw_material SET result = 'Fail', rejection_qty = $1, notes = $2, inspected_by = $3, inspection_date = CURRENT_DATE
        WHERE id = $4
      `, [parseFloat(rejection_qty || passQty), notes || qc.notes, req.user.id, id]);

      // 3. Auto-create linked NCR record
      const ncrNo = await generateDocNumber(client, 'NCR');
      await client.query(`
        INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, status, raised_by)
        VALUES ($1, 'raw', $2, $3, 'Open', $4)
      `, [ncrNo, id, `Raw Material QC Failed for GRN ${qc.grn_no}, Item ID: ${qc.item_id}. Notes: ${notes || 'QC rejection'}`, req.user.id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'APPROVE_RAW_QC', 'qc', id, req);
    return res.status(200).json({ success: true, message: `Raw Material QC updated to ${result}.` });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// Approve/Process Final Product QC
export const approveFinalQC = async (req, res, next) => {
  const { id } = req.params; // qc_final id or work_order_id
  const { result, notes } = req.body; // result: 'Pass' | 'Fail'

  if (!result || !['Pass', 'Fail'].includes(result)) {
    return res.status(400).json({ success: false, message: "result must be 'Pass' or 'Fail'." });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Find qc_final or work order
    const qcRes = await client.query(`
      SELECT qf.*, wo.wo_no, wo.produced_qty, wo.bom_id, b.finished_item_id
      FROM qc_final qf
      JOIN work_orders wo ON qf.work_order_id = wo.id
      JOIN bom b ON wo.bom_id = b.id
      WHERE qf.id = $1 OR qf.work_order_id = $1 FOR UPDATE
    `, [id]);

    if (qcRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Final QC record not found.' });
    }

    const qc = qcRes.rows[0];
    const fgQty = parseFloat(qc.produced_qty || 0);

    if (result === 'Pass') {
      // 1. Update work_orders wo_qc_status = 'Passed'
      await client.query(`
        UPDATE work_orders SET wo_qc_status = 'Passed', updated_at = NOW()
        WHERE id = $1
      `, [qc.work_order_id]);

      // 2. Update qc_final record
      await client.query(`
        UPDATE qc_final SET result = 'Pass', notes = $1, inspected_by = $2, inspection_date = CURRENT_DATE
        WHERE id = $3
      `, [notes || qc.notes, req.user.id, qc.id]);

      // 3. Increment stock for Finished Goods
      if (qc.finished_item_id && fgQty > 0) {
        await client.query(`
          INSERT INTO stock_transactions (item_id, transaction_type, qty, reference_type, reference_id, date, notes, created_by)
          VALUES ($1, 'IN', $2, 'WorkOrder', $3, CURRENT_DATE, $4, $5)
        `, [qc.finished_item_id, fgQty, qc.work_order_id, `Final QC Passed for WO ${qc.wo_no}`, req.user.id]);

        await client.query(`
          UPDATE items SET current_stock = current_stock + $1, updated_at = NOW()
          WHERE id = $2
        `, [fgQty, qc.finished_item_id]);
      }
    } else {
      // Result === 'Fail'
      // 1. Update work_orders wo_qc_status = 'Failed'
      await client.query(`
        UPDATE work_orders SET wo_qc_status = 'Failed', updated_at = NOW()
        WHERE id = $1
      `, [qc.work_order_id]);

      // 2. Update qc_final record
      await client.query(`
        UPDATE qc_final SET result = 'Fail', notes = $1, inspected_by = $2, inspection_date = CURRENT_DATE
        WHERE id = $3
      `, [notes || qc.notes, req.user.id, qc.id]);

      // 3. Auto-create linked NCR
      const ncrNo = await generateDocNumber(client, 'NCR');
      await client.query(`
        INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, status, raised_by)
        VALUES ($1, 'final', $2, $3, 'Open', $4)
      `, [ncrNo, qc.id, `Final Product QC Failed for WO ${qc.wo_no}. Notes: ${notes || 'QC rejection'}`, req.user.id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'APPROVE_FINAL_QC', 'qc', qc.id, req);
    return res.status(200).json({ success: true, message: `Final QC updated to ${result}.` });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

export const createFinalQC = async (req, res, next) => {
  const { work_order_id, result, notes } = req.body;
  if (!work_order_id || !result) return res.status(400).json({ success: false, message: 'work_order_id, result required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const qcRes = await client.query(`
      INSERT INTO qc_final (work_order_id, inspected_by, inspection_date, result, notes)
      VALUES ($1,$2,CURRENT_DATE,$3,$4) RETURNING *
    `, [work_order_id, req.user.id, result, notes]);
    const qcId = qcRes.rows[0].id;

    if (result === 'Rejected' || result === 'Fail') {
      const ncrNo = await generateDocNumber(client, 'NCR');
      await client.query(`
        INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, status, raised_by)
        VALUES ($1, 'final', $2, $3, 'Open', $4)
      `, [ncrNo, qcId, `Final product QC failure on WO ID ${work_order_id}`, req.user.id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_FINAL_QC', 'qc', qcId, req);
    return res.status(201).json({ success: true, record: qcRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

// ==========================================
// 4. NCR
// ==========================================

export const getNCRs = async (req, res, next) => {
  try {
    const { status, sourceType } = req.query;
    const params = []; const wc = [];
    if (status) { params.push(status); wc.push(`n.status = $${params.length}`); }
    if (sourceType) { params.push(sourceType); wc.push(`n.source_type = $${params.length}`); }
    const where = wc.length ? `WHERE ${wc.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT n.*, u.name AS raised_by_name
      FROM ncr n
      LEFT JOIN users u ON n.raised_by = u.id
      ${where} ORDER BY n.created_at DESC
    `, params);
    return res.status(200).json({ success: true, ncrs: result.rows });
  } catch (e) { next(e); }
};

export const raiseNCR = async (req, res, next) => {
  const { source_type, source_id, defect_description } = req.body;
  if (!source_type || !source_id || !defect_description?.trim()) return res.status(400).json({ success: false, message: 'source_type, source_id, defect_description required.' });
  try {
    const ncrNo = await generateDocNumber(db, 'NCR');
    const result = await db.query(`
      INSERT INTO ncr (ncr_no, source_type, source_id, defect_description, raised_by, status)
      VALUES ($1,$2,$3,$4,$5,'Open') RETURNING *
    `, [ncrNo, source_type, source_id, defect_description.trim(), req.user.id]);
    return res.status(201).json({ success: true, ncr: result.rows[0] });
  } catch (e) { next(e); }
};

export const updateNCR = async (req, res, next) => {
  const { id } = req.params;
  const { root_cause, corrective_action, status } = req.body;
  try {
    const result = await db.query(`
      UPDATE ncr SET root_cause=$1, corrective_action=$2, status=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *
    `, [root_cause, corrective_action, status, id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'NCR not found.' });
    return res.status(200).json({ success: true, ncr: result.rows[0] });
  } catch (e) { next(e); }
};
