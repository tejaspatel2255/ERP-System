import bcryptjs from 'bcryptjs';
import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
const db = { query: dbQuery, pool };

// Helper to initialize leave balances for a year if they don't exist
const ensureLeaveBalances = async (employeeId, year, client = db) => {
  const check = await client.query(`
    SELECT COUNT(*)::int AS cnt FROM leave_balances 
    WHERE employee_id = $1 AND year = $2
  `, [employeeId, year]);

  if (check.rows[0].cnt === 0) {
    // Leave balances should be refreshed on Jan 1 each year.
    // For now, initializing on first access if not found.
    const types = await client.query(`SELECT id, days_allowed_per_year FROM leave_types`);
    for (const lt of types.rows) {
      await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, remaining_days)
        VALUES ($1, $2, $3, $4, 0, $4)
        ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
      `, [employeeId, lt.id, year, lt.days_allowed_per_year]);
    }
  }
};

// Helper to get employee ID from user ID (for self service)
const getEmployeeIdFromUserId = async (userId) => {
  const res = await db.query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
  return res.rows[0]?.id || null;
};

// ==========================================
// 1. EMPLOYEES
// ==========================================

export const getEmployees = async (req, res, next) => {
  try {
    const { department_id } = req.query;
    let queryText = `
      SELECT e.*, d.name AS department_name, u.name AS user_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_active = TRUE
    `;
    const params = [];
    if (department_id) {
      params.push(department_id);
      queryText += ` AND e.department_id = $1`;
    }
    queryText += ` ORDER BY e.name ASC`;
    const result = await db.query(queryText, params);
    return res.status(200).json({ success: true, employees: result.rows });
  } catch (e) { next(e); }
};

export const createEmployee = async (req, res, next) => {
  const { emp_code, name, email, phone, department_id, designation, join_date } = req.body;
  if (!emp_code || !name || !designation) {
    return res.status(400).json({ success: false, message: 'emp_code, name, and designation are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let createdUserId = null;
    if (email) {
      // Check if user already exists
      const userCheck = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (userCheck.rows.length > 0) {
        createdUserId = userCheck.rows[0].id;
      } else {
        // Create user account with default password Welcome@123
        const passwordHash = await bcryptjs.hash('Welcome@123', 12);
        const userRes = await client.query(`
          INSERT INTO users (name, email, password_hash, department_id, is_active)
          VALUES ($1, $2, $3, $4, TRUE) RETURNING id
        `, [name, email, passwordHash, department_id || null]);
        createdUserId = userRes.rows[0].id;

        // Auto-assign Employee role if it exists
        const empRole = await client.query(`SELECT id FROM roles WHERE name = 'Employee' OR name = 'Staff' LIMIT 1`);
        if (empRole.rows.length > 0) {
          await client.query(`
            INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
          `, [createdUserId, empRole.rows[0].id]);
        }
      }
    }

    const empRes = await client.query(`
      INSERT INTO employees (emp_code, name, email, phone, department_id, designation, join_date, user_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING *
    `, [emp_code, name, email || null, phone || null, department_id || null, designation, join_date || new Date(), createdUserId]);

    const emp = empRes.rows[0];

    // Pre-initialize leave balances for the current year
    const currentYear = new Date().getFullYear();
    await ensureLeaveBalances(emp.id, currentYear, client);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_EMPLOYEE', 'hr', emp.id, req);

    return res.status(201).json({ success: true, employee: emp });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

export const getEmployeeById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const empRes = await db.query(`
      SELECT e.*, d.name AS department_name, u.name AS user_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const trainingRes = await db.query(`
      SELECT ta.status, ts.title, ts.scheduled_date
      FROM training_attendance ta
      JOIN training_sessions ts ON ta.session_id = ts.id
      WHERE ta.employee_id = $1
    `, [id]);

    const leavesRes = await db.query(`
      SELECT la.*, lt.name AS leave_type_name
      FROM leave_applications la
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.employee_id = $1
      ORDER BY la.from_date DESC
    `, [id]);

    return res.status(200).json({
      success: true,
      employee: empRes.rows[0],
      training: trainingRes.rows,
      leaves: leavesRes.rows
    });
  } catch (e) { next(e); }
};

export const updateEmployee = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, department_id, designation, join_date, is_active, user_id } = req.body;
  try {
    const result = await db.query(`
      UPDATE employees
      SET name = $1, email = $2, phone = $3, department_id = $4, designation = $5, join_date = $6, is_active = $7, user_id = $8, updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [name, email, phone, department_id || null, designation, join_date, is_active !== undefined ? is_active : true, user_id || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (user_id) {
      const currentYear = new Date().getFullYear();
      await ensureLeaveBalances(id, currentYear);
    }

    await logActivity(req.user.id, 'UPDATE_EMPLOYEE', 'hr', id, req);
    return res.status(200).json({ success: true, employee: result.rows[0] });
  } catch (e) { next(e); }
};

// ==========================================
// 2. ATTENDANCE
// ==========================================

export const getAttendance = async (req, res, next) => {
  try {
    const { employee_id, month } = req.query; // month in YYYY-MM
    let queryText = `
      SELECT a.*, e.name AS employee_name, e.emp_code
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) {
      params.push(employee_id);
      queryText += ` AND a.employee_id = $${params.length}`;
    }
    if (month) {
      params.push(month);
      queryText += ` AND to_char(a.date, 'YYYY-MM') = $${params.length}`;
    }
    queryText += ` ORDER BY a.date DESC`;
    const result = await db.query(queryText, params);
    return res.status(200).json({ success: true, attendance: result.rows });
  } catch (e) { next(e); }
};

export const markAttendance = async (req, res, next) => {
  const { date, employee_id, status, check_in, check_out } = req.body;
  if (!date || !employee_id || !status) {
    return res.status(400).json({ success: false, message: 'date, employee_id, and status are required.' });
  }
  try {
    const result = await db.query(`
      INSERT INTO attendance (employee_id, date, status, check_in, check_out)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (employee_id, date) DO UPDATE 
      SET status = $3, check_in = $4, check_out = $5, updated_at = NOW()
      RETURNING *
    `, [employee_id, date, status, check_in || null, check_out || null]);

    return res.status(200).json({ success: true, attendance: result.rows[0] });
  } catch (e) { next(e); }
};

export const correctAttendance = async (req, res, next) => {
  const { id } = req.params;
  const { status, check_in, check_out } = req.body;
  try {
    const result = await db.query(`
      UPDATE attendance
      SET status = $1, check_in = $2, check_out = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [status, check_in, check_out, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    return res.status(200).json({ success: true, attendance: result.rows[0] });
  } catch (e) { next(e); }
};

export const getAttendanceSummary = async (req, res, next) => {
  const { empId, year, month } = req.params;
  const formattedMonth = `${year}-${String(month).padStart(2, '0')}`;
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Present')::int AS present_count,
        COUNT(*) FILTER (WHERE status = 'Absent')::int AS absent_count,
        COUNT(*) FILTER (WHERE status = 'Half Day')::int AS half_day_count,
        COUNT(*) FILTER (WHERE status = 'Leave')::int AS leave_count
      FROM attendance
      WHERE employee_id = $1 AND to_char(date, 'YYYY-MM') = $2
    `, [empId, formattedMonth]);

    return res.status(200).json({ success: true, summary: result.rows[0] });
  } catch (e) { next(e); }
};

// ==========================================
// 3. LEAVE
// ==========================================

export const getLeaveTypes = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM leave_types ORDER BY name ASC`);
    return res.status(200).json({ success: true, leaveTypes: result.rows });
  } catch (e) { next(e); }
};

export const createLeaveType = async (req, res, next) => {
  const { name, days_allowed_per_year } = req.body;
  if (!name || !days_allowed_per_year) {
    return res.status(400).json({ success: false, message: 'name and days_allowed_per_year are required.' });
  }
  try {
    const result = await db.query(`
      INSERT INTO leave_types (name, days_allowed_per_year)
      VALUES ($1, $2) RETURNING *
    `, [name, parseInt(days_allowed_per_year)]);
    return res.status(201).json({ success: true, leaveType: result.rows[0] });
  } catch (e) { next(e); }
};

export const getLeaveApplications = async (req, res, next) => {
  const { status, employee_id } = req.query;
  try {
    let queryText = `
      SELECT la.*, e.name AS employee_name, lt.name AS leave_type_name, u.name AS approver_name
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users u ON la.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      params.push(status);
      queryText += ` AND la.status = $${params.length}`;
    }
    if (employee_id) {
      params.push(employee_id);
      queryText += ` AND la.employee_id = $${params.length}`;
    }
    queryText += ` ORDER BY la.from_date DESC`;
    const result = await db.query(queryText, params);
    return res.status(200).json({ success: true, applications: result.rows });
  } catch (e) { next(e); }
};

export const applyLeave = async (req, res, next) => {
  const { employee_id, leave_type_id, from_date, to_date, reason } = req.body;
  if (!employee_id || !leave_type_id || !from_date || !to_date || !reason) {
    return res.status(400).json({ success: false, message: 'All leave application fields are required.' });
  }

  // Constraint: Leave cannot be applied for past dates
  const today = new Date().toISOString().slice(0, 10);
  if (from_date < today) {
    return res.status(400).json({ success: false, message: 'Leave from date cannot be in the past.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const from = new Date(from_date);
    const to = new Date(to_date);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const currentYear = new Date(from_date).getFullYear();
    await ensureLeaveBalances(employee_id, currentYear, client);

    const balanceRes = await client.query(`
      SELECT remaining_days FROM leave_balances
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
    `, [employee_id, leave_type_id, currentYear]);

    const remaining = balanceRes.rows[0]?.remaining_days || 0;
    if (remaining < diffDays) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Requested: ${diffDays} days, Remaining: ${remaining} days.`
      });
    }

    const result = await client.query(`
      INSERT INTO leave_applications (employee_id, leave_type_id, from_date, to_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *
    `, [employee_id, leave_type_id, from_date, to_date, reason]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, application: result.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

export const approveLeave = async (req, res, next) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query(`SELECT * FROM leave_applications WHERE id = $1`, [id]);
    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Leave application not found.' });
    }
    const app = appRes.rows[0];

    if (app.status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Leave application is already reviewed.' });
    }

    const from = new Date(app.from_date);
    const to = new Date(app.to_date);
    const diffDays = Math.ceil(Math.abs(to - from) / (1000 * 60 * 60 * 24)) + 1;
    const year = from.getFullYear();

    await ensureLeaveBalances(app.employee_id, year, client);

    // Deduct leave balance
    await client.query(`
      UPDATE leave_balances
      SET used_days = used_days + $1, remaining_days = remaining_days - $1, updated_at = NOW()
      WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
    `, [diffDays, app.employee_id, app.leave_type_id, year]);

    // Update leave application status
    const result = await client.query(`
      UPDATE leave_applications
      SET status = 'Approved', approved_by = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [req.user.id, id]);

    // Insert attendance entries marked as 'Leave'
    let current = new Date(app.from_date);
    while (current <= to) {
      const dateStr = current.toISOString().slice(0, 10);
      await client.query(`
        INSERT INTO attendance (employee_id, date, status)
        VALUES ($1, $2, 'Leave')
        ON CONFLICT (employee_id, date) DO UPDATE SET status = 'Leave', updated_at = NOW()
      `, [app.employee_id, dateStr]);
      current.setDate(current.getDate() + 1);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'APPROVE_LEAVE', 'hr', id, req);

    return res.status(200).json({ success: true, application: result.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

export const rejectLeave = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body; // Rejection remarks
  try {
    const result = await db.query(`
      UPDATE leave_applications
      SET status = 'Rejected', approved_by = $1, reason = concat(reason, E'\nRejection Remark: ', $2::text), updated_at = NOW()
      WHERE id = $3 AND status = 'Pending' RETURNING *
    `, [req.user.id, reason || '', id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Leave application not found or not in Pending state.' });
    }

    await logActivity(req.user.id, 'REJECT_LEAVE', 'hr', id, req);
    return res.status(200).json({ success: true, application: result.rows[0] });
  } catch (e) { next(e); }
};

export const getLeaveBalance = async (req, res, next) => {
  const { empId } = req.params;
  try {
    const currentYear = new Date().getFullYear();
    await ensureLeaveBalances(empId, currentYear);
    const result = await db.query(`
      SELECT lb.*, lt.name AS leave_type_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = $2
    `, [empId, currentYear]);
    return res.status(200).json({ success: true, balances: result.rows });
  } catch (e) { next(e); }
};

// ==========================================
// 4. SELF SERVICE
// ==========================================

export const getSelfAttendance = async (req, res, next) => {
  try {
    const empId = await getEmployeeIdFromUserId(req.user.id);
    if (!empId) return res.status(404).json({ success: false, message: 'Employee profile not linked.' });

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const result = await db.query(`
      SELECT * FROM attendance WHERE employee_id = $1 AND to_char(date, 'YYYY-MM') = $2
      ORDER BY date ASC
    `, [empId, currentMonth]);

    return res.status(200).json({ success: true, attendance: result.rows });
  } catch (e) { next(e); }
};

export const getSelfLeaveBalance = async (req, res, next) => {
  try {
    const empId = await getEmployeeIdFromUserId(req.user.id);
    if (!empId) return res.status(404).json({ success: false, message: 'Employee profile not linked.' });

    const currentYear = new Date().getFullYear();
    await ensureLeaveBalances(empId, currentYear);

    const result = await db.query(`
      SELECT lb.*, lt.name AS leave_type_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = $2
    `, [empId, currentYear]);

    return res.status(200).json({ success: true, balances: result.rows });
  } catch (e) { next(e); }
};

export const selfApplyLeave = async (req, res, next) => {
  try {
    const empId = await getEmployeeIdFromUserId(req.user.id);
    if (!empId) return res.status(404).json({ success: false, message: 'Employee profile not linked.' });

    req.body.employee_id = empId;
    return applyLeave(req, res, next);
  } catch (e) { next(e); }
};

export const getSelfLeaveApplications = async (req, res, next) => {
  try {
    const empId = await getEmployeeIdFromUserId(req.user.id);
    if (!empId) return res.status(404).json({ success: false, message: 'Employee profile not linked.' });

    const result = await db.query(`
      SELECT la.*, lt.name AS leave_type_name, u.name AS approver_name
      FROM leave_applications la
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users u ON la.approved_by = u.id
      WHERE la.employee_id = $1
      ORDER BY la.from_date DESC
    `, [empId]);

    return res.status(200).json({ success: true, applications: result.rows });
  } catch (e) { next(e); }
};

// ==========================================
// 5. TRAINING
// ==========================================

export const getTrainingSessions = async (req, res, next) => {
  try {
    await db.query(`
      UPDATE training_sessions
      SET status = CASE
        WHEN scheduled_date::date < CURRENT_DATE THEN 'Completed'
        WHEN scheduled_date::date = CURRENT_DATE THEN 'Ongoing'
        ELSE 'Scheduled'
      END,
      updated_at = NOW()
      WHERE status IN ('Scheduled', 'Ongoing')
    `);

    const result = await db.query(`
      SELECT ts.*,
             (SELECT COUNT(*)::int FROM training_attendance ta WHERE ta.session_id = ts.id) AS assigned_count,
             (SELECT COUNT(*)::int FROM training_attendance ta WHERE ta.session_id = ts.id AND ta.status = 'Completed') AS completed_count
      FROM training_sessions ts
      ORDER BY ts.scheduled_date DESC
    `);
    return res.status(200).json({ success: true, sessions: result.rows });
  } catch (e) { next(e); }
};

export const createTrainingSession = async (req, res, next) => {
  const { title, description, trainer, scheduled_date, employee_ids } = req.body;
  if (!title || !trainer || !scheduled_date) {
    return res.status(400).json({ success: false, message: 'title, trainer, and scheduled_date are required.' });
  }

  // Constraint: Session date cannot be in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessionDate = new Date(scheduled_date);
  sessionDate.setHours(0, 0, 0, 0);
  if (sessionDate < today) {
    return res.status(400).json({ success: false, message: 'Training session date cannot be in the past.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tsRes = await client.query(`
      INSERT INTO training_sessions (title, description, trainer, scheduled_date, status)
      VALUES ($1, $2, $3, $4, 'Scheduled') RETURNING *
    `, [title, description || null, trainer, scheduled_date]);
    const sessionId = tsRes.rows[0].id;

    if (employee_ids && Array.isArray(employee_ids)) {
      for (const empId of employee_ids) {
        await client.query(`
          INSERT INTO training_attendance (session_id, employee_id, status)
          VALUES ($1, $2, 'Assigned')
          ON CONFLICT (session_id, employee_id) DO NOTHING
        `, [sessionId, empId]);
      }
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE_TRAINING_SESSION', 'hr', sessionId, req);

    return res.status(201).json({ success: true, session: tsRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

export const getTrainingSessionById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const sessionRes = await db.query(`SELECT * FROM training_sessions WHERE id = $1`, [id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Training session not found.' });
    }

    const attendees = await db.query(`
      SELECT ta.*, e.name AS employee_name, e.emp_code, e.designation
      FROM training_attendance ta
      JOIN employees e ON ta.employee_id = e.id
      WHERE ta.session_id = $1
    `, [id]);

    return res.status(200).json({ success: true, session: sessionRes.rows[0], attendees: attendees.rows });
  } catch (e) { next(e); }
};

export const markTrainingAttendance = async (req, res, next) => {
  const { id } = req.params; // session_id
  const { employee_id, status } = req.body; // Completed, Absent
  if (!employee_id || !status) {
    return res.status(400).json({ success: false, message: 'employee_id and status are required.' });
  }
  try {
    const result = await db.query(`
      UPDATE training_attendance
      SET status = $1, updated_at = NOW()
      WHERE session_id = $2 AND employee_id = $3 RETURNING *
    `, [status, id, employee_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendee record not found.' });
    }

    // Auto update session status to Completed if all attendees completed/marked
    const pendingCount = await db.query(`
      SELECT COUNT(*)::int AS cnt FROM training_attendance
      WHERE session_id = $1 AND status = 'Assigned'
    `, [id]);

    if (pendingCount.rows[0].cnt === 0) {
      await db.query(`
        UPDATE training_sessions SET status = 'Completed', updated_at = NOW() WHERE id = $1
      `, [id]);
    }

    return res.status(200).json({ success: true, attendance: result.rows[0] });
  } catch (e) { next(e); }
};
