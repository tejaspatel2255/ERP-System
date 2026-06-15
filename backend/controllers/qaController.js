import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
const db = { query: dbQuery, pool };

// ==========================================
// 1. QA CHECKLISTS
// ==========================================

export const getChecklists = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT qc.*, COUNT(qci.id)::int AS item_count
      FROM qa_checklists qc
      LEFT JOIN qa_checklist_items qci ON qc.id = qci.checklist_id
      GROUP BY qc.id ORDER BY qc.name ASC
    `);
    return res.status(200).json({ success: true, checklists: result.rows });
  } catch (e) { next(e); }
};

export const createChecklist = async (req, res, next) => {
  const { name, product_category, is_active, items } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'name is required.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const clRes = await client.query(`INSERT INTO qa_checklists (name, product_category, is_active) VALUES ($1,$2,$3) RETURNING *`, [name.trim(), product_category, is_active !== false]);
    const clId = clRes.rows[0].id;
    for (const item of (items || [])) {
      await client.query(`INSERT INTO qa_checklist_items (checklist_id, question, expected_value) VALUES ($1,$2,$3)`, [clId, item.question, item.expected_value || null]);
    }
    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_CHECKLIST', 'qa', clId, req);
    return res.status(201).json({ success: true, checklist: clRes.rows[0] });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const getChecklistById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const clRes = await db.query(`SELECT * FROM qa_checklists WHERE id = $1`, [id]);
    if (!clRes.rows.length) return res.status(404).json({ success: false, message: 'Checklist not found.' });
    const itemsRes = await db.query(`SELECT * FROM qa_checklist_items WHERE checklist_id = $1 ORDER BY created_at ASC`, [id]);
    return res.status(200).json({ success: true, checklist: clRes.rows[0], items: itemsRes.rows });
  } catch (e) { next(e); }
};

export const updateChecklist = async (req, res, next) => {
  const { id } = req.params;
  const { name, product_category, is_active, items } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE qa_checklists SET name=$1, product_category=$2, is_active=$3, updated_at=NOW() WHERE id=$4`, [name, product_category, is_active, id]);
    if (items?.length) {
      await client.query(`DELETE FROM qa_checklist_items WHERE checklist_id = $1`, [id]);
      for (const item of items) await client.query(`INSERT INTO qa_checklist_items (checklist_id, question, expected_value) VALUES ($1,$2,$3)`, [id, item.question, item.expected_value || null]);
    }
    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Checklist updated.' });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

// ==========================================
// 2. QA TESTS
// ==========================================

export const getTests = async (req, res, next) => {
  try {
    const { woId, result, startDate, endDate } = req.query;
    const params = []; const wc = [];
    if (woId) { params.push(woId); wc.push(`qt.work_order_id = $${params.length}`); }
    if (result) { params.push(result); wc.push(`qt.result = $${params.length}`); }
    if (startDate) { params.push(startDate); wc.push(`qt.test_date >= $${params.length}::date`); }
    if (endDate) { params.push(endDate); wc.push(`qt.test_date <= $${params.length}::date`); }
    const where = wc.length ? `WHERE ${wc.join(' AND ')}` : '';

    const result2 = await db.query(`
      SELECT qt.*, wo.wo_no, qc.name AS checklist_name, u.name AS tested_by_name
      FROM qa_tests qt
      LEFT JOIN work_orders wo ON qt.work_order_id = wo.id
      LEFT JOIN qa_checklists qc ON qt.checklist_id = qc.id
      LEFT JOIN users u ON qt.tested_by = u.id
      ${where} ORDER BY qt.test_date DESC
    `, params);
    return res.status(200).json({ success: true, tests: result2.rows });
  } catch (e) { next(e); }
};

export const createTest = async (req, res, next) => {
  const { work_order_id, checklist_id, test_date, notes } = req.body;
  if (!work_order_id || !checklist_id) return res.status(400).json({ success: false, message: 'work_order_id and checklist_id required.' });
  try {
    const result = await db.query(`
      INSERT INTO qa_tests (work_order_id, checklist_id, tested_by, test_date, result, notes, approval_status)
      VALUES ($1,$2,$3,$4,'Pending',$5,'Pending') RETURNING *
    `, [work_order_id, checklist_id, req.user.id, test_date || new Date().toISOString().slice(0, 10), notes]);
    await logActivity(req.user.id, 'CREATE_QA_TEST', 'qa', result.rows[0].id, req);
    return res.status(201).json({ success: true, test: result.rows[0] });
  } catch (e) { next(e); }
};

export const getTestById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const testRes = await db.query(`
      SELECT qt.*, wo.wo_no, qc.name AS checklist_name, u.name AS tested_by_name
      FROM qa_tests qt LEFT JOIN work_orders wo ON qt.work_order_id = wo.id
      LEFT JOIN qa_checklists qc ON qt.checklist_id = qc.id LEFT JOIN users u ON qt.tested_by = u.id WHERE qt.id = $1
    `, [id]);
    if (!testRes.rows.length) return res.status(404).json({ success: false, message: 'Test not found.' });

    const resultsRes = await db.query(`
      SELECT qtr.*, qci.question, qci.expected_value FROM qa_test_results qtr
      LEFT JOIN qa_checklist_items qci ON qtr.checklist_item_id = qci.id WHERE qtr.test_id = $1
    `, [id]);

    const reportRes = await db.query(`SELECT * FROM qa_reports WHERE test_id = $1`, [id]);

    return res.status(200).json({ success: true, test: testRes.rows[0], results: resultsRes.rows, report: reportRes.rows[0] || null });
  } catch (e) { next(e); }
};

export const submitTestResults = async (req, res, next) => {
  const { id } = req.params;
  const { results } = req.body; // [{checklist_item_id, actual_value, passed}]
  if (!results?.length) return res.status(400).json({ success: false, message: 'results array required.' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM qa_test_results WHERE test_id = $1`, [id]);
    for (const r of results) {
      await client.query(`INSERT INTO qa_test_results (test_id, checklist_item_id, actual_value, passed) VALUES ($1,$2,$3,$4)`, [id, r.checklist_item_id, r.actual_value, r.passed]);
    }
    const allPass = results.every(r => r.passed === true || r.passed === 'true');
    const overallResult = allPass ? 'Pass' : 'Fail';
    await client.query(`UPDATE qa_tests SET result=$1, updated_at=NOW() WHERE id=$2`, [overallResult, id]);
    await client.query('COMMIT');
    await logActivity(req.user.id, 'SUBMIT_QA_RESULTS', 'qa', id, req);
    return res.status(200).json({ success: true, result: overallResult });
  } catch (e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
};

export const uploadTestReport = async (req, res, next) => {
  const { id } = req.params;
  const { file_url } = req.body;
  if (!file_url) return res.status(400).json({ success: false, message: 'file_url required.' });
  try {
    const result = await db.query(`
      INSERT INTO qa_reports (test_id, file_url) VALUES ($1,$2) RETURNING *
    `, [id, file_url]);
    return res.status(201).json({ success: true, report: result.rows[0] });
  } catch (e) { next(e); }
};

export const approveTest = async (req, res, next) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // 'Approved' | 'Rejected'
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });

  const testRes = await db.query(`SELECT tested_by FROM qa_tests WHERE id = $1`, [id]);
  if (testRes.rows.length && testRes.rows[0].tested_by === req.user.id) {
    return res.status(403).json({ success: false, message: 'You cannot approve a test you conducted.' });
  }

  try {
    await db.query(`INSERT INTO qa_approvals (test_id, approved_by, status, remarks) VALUES ($1,$2,$3,$4)`, [id, req.user.id, status, remarks]);
    await db.query(`UPDATE qa_tests SET approval_status=$1, approved_by=$2, approval_remarks=$3, updated_at=NOW() WHERE id=$4`, [status, req.user.id, remarks, id]);
    await logActivity(req.user.id, `${status.toUpperCase()}_QA_TEST`, 'qa', id, req);
    return res.status(200).json({ success: true, message: `Test ${status}.` });
  } catch (e) { next(e); }
};

export const getPendingApprovals = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT qt.*, wo.wo_no, qc.name AS checklist_name, u.name AS tested_by_name
      FROM qa_tests qt LEFT JOIN work_orders wo ON qt.work_order_id = wo.id
      LEFT JOIN qa_checklists qc ON qt.checklist_id = qc.id LEFT JOIN users u ON qt.tested_by = u.id
      WHERE qt.approval_status = 'Pending' AND qt.result != 'Pending'
      ORDER BY qt.test_date DESC
    `);
    return res.status(200).json({ success: true, tests: result.rows });
  } catch (e) { next(e); }
};
