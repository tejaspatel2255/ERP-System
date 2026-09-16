import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
const db = { query: dbQuery, pool };

// ==========================================
// 1. ASSETS
// ==========================================

export const getAssets = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT a.*,
        (SELECT COUNT(*)::int FROM maintenance_schedules WHERE asset_id = a.id) AS schedule_count,
        (SELECT COUNT(*)::int FROM issue_logs WHERE asset_id = a.id AND status != 'Closed') AS open_issues
      FROM assets a ORDER BY a.name ASC
    `);
    return res.status(200).json({ success: true, assets: result.rows });
  } catch (e) { next(e); }
};

export const createAsset = async (req, res, next) => {
  const { name, asset_code, location, purchase_date, purchase_value, status } = req.body;
  if (!name?.trim() || !asset_code?.trim()) return res.status(400).json({ success: false, message: 'name and asset_code are required.' });
  try {
    const result = await db.query(`
      INSERT INTO assets (name, asset_code, location, purchase_date, purchase_value, status)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [name.trim(), asset_code.trim(), location, purchase_date || null, purchase_value || null, status || 'Active']);
    await logActivity(req.user.id, 'CREATE_ASSET', 'maintenance', result.rows[0].id, req);
    return res.status(201).json({ success: true, asset: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, message: `Asset code '${asset_code}' already exists.` });
    next(e);
  }
};

export const getAssetById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const assetRes = await db.query(`SELECT * FROM assets WHERE id = $1`, [id]);
    if (!assetRes.rows.length) return res.status(404).json({ success: false, message: 'Asset not found.' });

    const schedules = await db.query(`
      SELECT ms.*, u.name AS assigned_to_name FROM maintenance_schedules ms
      LEFT JOIN users u ON ms.assigned_to = u.id WHERE ms.asset_id = $1 ORDER BY ms.next_due_date ASC
    `, [id]);

    const logs = await db.query(`
      SELECT ml.*, u.name AS performed_by_name FROM maintenance_logs ml
      LEFT JOIN users u ON ml.performed_by = u.id WHERE ml.asset_id = $1 ORDER BY ml.performed_at DESC LIMIT 20
    `, [id]);

    const issues = await db.query(`
      SELECT il.*, u.name AS assigned_to_name FROM issue_logs il
      LEFT JOIN users u ON il.assigned_to = u.id WHERE il.asset_id = $1 ORDER BY il.reported_at DESC
    `, [id]);

    return res.status(200).json({ success: true, asset: assetRes.rows[0], schedules: schedules.rows, logs: logs.rows, issues: issues.rows });
  } catch (e) { next(e); }
};

export const updateAsset = async (req, res, next) => {
  const { id } = req.params;
  const { name, asset_code, location, purchase_date, purchase_value, status } = req.body;
  try {
    let affectedWorkOrders = [];
    if (['Under Repair', 'Maintenance'].includes(status)) {
      const woRes = await db.query(`
        SELECT id, wo_no, status, planned_qty
        FROM work_orders
        WHERE asset_id = $1 AND status IN ('Pending', 'In Progress')
      `, [id]);
      affectedWorkOrders = woRes.rows;
    }

    const result = await db.query(`
      UPDATE assets SET name=$1, asset_code=$2, location=$3, purchase_date=$4, purchase_value=$5, status=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *
    `, [name, asset_code, location, purchase_date || null, purchase_value || null, status, id]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Asset not found.' });
    await logActivity(req.user.id, 'UPDATE_ASSET', 'maintenance', id, req);

    return res.status(200).json({
      success: true,
      asset: result.rows[0],
      affectedWorkOrdersCount: affectedWorkOrders.length,
      affectedWorkOrders,
      warning: affectedWorkOrders.length > 0 ? `${affectedWorkOrders.length} active work order(s) are currently scheduled on this machine.` : null
    });
  } catch (e) { next(e); }
};

// ==========================================
// 2. MAINTENANCE SCHEDULES
// ==========================================

export const getSchedules = async (req, res, next) => {
  try {
    const { due } = req.query; // 'week' | 'month'
    let dateFilter = '';
    if (due === 'week') dateFilter = `AND ms.next_due_date <= CURRENT_DATE + INTERVAL '7 days'`;
    if (due === 'month') dateFilter = `AND ms.next_due_date <= CURRENT_DATE + INTERVAL '30 days'`;

    const result = await db.query(`
      SELECT ms.*, a.name AS asset_name, a.asset_code, a.location, u.name AS assigned_to_name,
        CASE
          WHEN ms.next_due_date < CURRENT_DATE THEN 'Overdue'
          WHEN ms.next_due_date = CURRENT_DATE THEN 'Due Today'
          ELSE 'On Track'
        END AS due_status
      FROM maintenance_schedules ms
      LEFT JOIN assets a ON ms.asset_id = a.id
      LEFT JOIN users u ON ms.assigned_to = u.id
      WHERE TRUE ${dateFilter}
      ORDER BY ms.next_due_date ASC
    `);
    return res.status(200).json({ success: true, schedules: result.rows });
  } catch (e) { next(e); }
};

export const createSchedule = async (req, res, next) => {
  const { asset_id, frequency, next_due_date, assigned_to, notes } = req.body;
  if (!asset_id || !frequency || !next_due_date) return res.status(400).json({ success: false, message: 'asset_id, frequency, next_due_date required.' });
  try {
    const result = await db.query(`
      INSERT INTO maintenance_schedules (asset_id, frequency, next_due_date, assigned_to, notes)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [asset_id, frequency, next_due_date, assigned_to || null, notes]);
    await logActivity(req.user.id, 'CREATE_SCHEDULE', 'maintenance', result.rows[0].id, req);
    return res.status(201).json({ success: true, schedule: result.rows[0] });
  } catch (e) { next(e); }
};

export const updateSchedule = async (req, res, next) => {
  const { id } = req.params;
  const { frequency, next_due_date, assigned_to, notes } = req.body;
  try {
    const result = await db.query(`
      UPDATE maintenance_schedules SET frequency=$1, next_due_date=$2, assigned_to=$3, notes=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [frequency, next_due_date, assigned_to || null, notes, id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Schedule not found.' });
    return res.status(200).json({ success: true, schedule: result.rows[0] });
  } catch (e) { next(e); }
};

export const logScheduleCompletion = async (req, res, next) => {
  const { id } = req.params;
  const { notes, next_due_date: customNextDue } = req.body;

  try {
    const schedRes = await db.query(`SELECT * FROM maintenance_schedules WHERE id = $1`, [id]);
    if (!schedRes.rows.length) return res.status(404).json({ success: false, message: 'Schedule not found.' });
    const sched = schedRes.rows[0];

    // Insert maintenance log
    await db.query(`
      INSERT INTO maintenance_logs (asset_id, schedule_id, performed_by, performed_at, notes, status)
      VALUES ($1,$2,$3,NOW(),$4,'Completed')
    `, [sched.asset_id, id, req.user.id, notes]);

    // Calculate next due date
    let nextDue = customNextDue;
    if (!nextDue) {
      const base = new Date();
      const freq = sched.frequency.toLowerCase();
      if (freq === 'daily') base.setDate(base.getDate() + 1);
      else if (freq === 'weekly') base.setDate(base.getDate() + 7);
      else if (freq === 'monthly') base.setMonth(base.getMonth() + 1);
      else if (freq === 'quarterly') base.setMonth(base.getMonth() + 3);
      else if (freq === 'annually') base.setFullYear(base.getFullYear() + 1);
      nextDue = base.toISOString().slice(0, 10);
    }

    await db.query(`UPDATE maintenance_schedules SET next_due_date=$1, updated_at=NOW() WHERE id=$2`, [nextDue, id]);
    await logActivity(req.user.id, 'LOG_MAINTENANCE', 'maintenance', id, req);
    return res.status(200).json({ success: true, nextDueDate: nextDue });
  } catch (e) { next(e); }
};

// ==========================================
// 3. MAINTENANCE ISSUES
// ==========================================

export const getIssues = async (req, res, next) => {
  try {
    const { status, priority, assetId } = req.query;
    const params = []; const wc = [];
    if (status) { params.push(status); wc.push(`il.status = $${params.length}`); }
    if (priority) { params.push(priority); wc.push(`il.priority = $${params.length}`); }
    if (assetId) { params.push(assetId); wc.push(`il.asset_id = $${params.length}`); }
    const where = wc.length ? `WHERE ${wc.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT il.*, a.name AS asset_name, a.asset_code,
             u1.name AS reported_by_name, u2.name AS assigned_to_name
      FROM issue_logs il
      LEFT JOIN assets a ON il.asset_id = a.id
      LEFT JOIN users u1 ON il.reported_by = u1.id
      LEFT JOIN users u2 ON il.assigned_to = u2.id
      ${where} ORDER BY
        CASE il.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
        il.reported_at DESC
    `, params);
    return res.status(200).json({ success: true, issues: result.rows });
  } catch (e) { next(e); }
};

export const createIssue = async (req, res, next) => {
  const { asset_id, description, priority, assigned_to } = req.body;
  if (!asset_id || !description?.trim()) return res.status(400).json({ success: false, message: 'asset_id and description required.' });
  try {
    const result = await db.query(`
      INSERT INTO issue_logs (asset_id, reported_by, description, priority, assigned_to, status)
      VALUES ($1,$2,$3,$4,$5,'Open') RETURNING *
    `, [asset_id, req.user.id, description.trim(), priority || 'Medium', assigned_to || null]);
    await logActivity(req.user.id, 'CREATE_ISSUE', 'maintenance', result.rows[0].id, req);
    return res.status(201).json({ success: true, issue: result.rows[0] });
  } catch (e) { next(e); }
};

export const getIssueById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT il.*, a.name AS asset_name, a.asset_code,
             u1.name AS reported_by_name, u2.name AS assigned_to_name
      FROM issue_logs il
      LEFT JOIN assets a ON il.asset_id = a.id
      LEFT JOIN users u1 ON il.reported_by = u1.id
      LEFT JOIN users u2 ON il.assigned_to = u2.id
      WHERE il.id = $1
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Issue not found.' });
    return res.status(200).json({ success: true, issue: result.rows[0] });
  } catch (e) { next(e); }
};

export const updateIssue = async (req, res, next) => {
  const { id } = req.params;
  const { status, priority, assigned_to, resolution_notes } = req.body;

  // Warn (but don't block) if resolver is same as reporter
  const issueRes = await db.query(`SELECT reported_by FROM issue_logs WHERE id = $1`, [id]);
  let warning = null;
  if (issueRes.rows.length && issueRes.rows[0].reported_by === req.user.id && status === 'Resolved') {
    warning = 'Warning: You are resolving an issue you raised.';
  }

  try {
    const resolved_at = status === 'Resolved' ? 'NOW()' : 'NULL';
    const result = await db.query(`
      UPDATE issue_logs
      SET status=$1, priority=$2, assigned_to=$3, resolution_notes=$4,
          resolved_at = ${status === 'Resolved' ? 'NOW()' : 'NULL'}, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [status, priority, assigned_to || null, resolution_notes, id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Issue not found.' });
    await logActivity(req.user.id, 'UPDATE_ISSUE', 'maintenance', id, req);
    return res.status(200).json({ success: true, issue: result.rows[0], warning });
  } catch (e) { next(e); }
};
