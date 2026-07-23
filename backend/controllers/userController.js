import bcryptjs from 'bcryptjs';
import { validationResult } from 'express-validator';
import db from '../models/db.js';

/**
 * Helper to log system activity
 */
export const logActivity = async (userId, action, moduleName, recordId, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const queryText = `
      INSERT INTO activity_logs (user_id, action, module, record_id, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await db.query(queryText, [userId, action, moduleName, recordId, ipAddress]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

/**
 * GET /api/users
 * List all users with departments and roles
 */
export const getUsers = async (req, res, next) => {
  try {
    // Pagination & Search query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const departmentId = req.query.departmentId || null;
    const roleId = req.query.roleId || null;

    let queryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.department_id, d.name AS department_name,
             COALESCE(
               (SELECT json_agg(r.name) 
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = u.id), '[]'
             ) AS roles
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE (u.name ILIKE $1 OR u.email ILIKE $1)
        AND ($2::uuid IS NULL OR u.department_id = $2)
    `;

    const queryParams = [`%${search}%`, departmentId];

    // If filtering by role, we restrict the user set
    if (roleId) {
      queryParams.push(roleId);
      queryText += ` AND EXISTS (
        SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role_id = $${queryParams.length}
      )`;
    }

    // Get count for pagination
    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countResult = await db.query(countQueryText, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Apply pagination
    queryParams.push(limit, offset);
    queryText += ` ORDER BY u.created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const usersResult = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Retrieve a single user details
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.department_id, d.name AS department_name,
             COALESCE(
               (SELECT json_agg(json_build_object('id', r.id, 'name', r.name)) 
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = u.id), '[]'
             ) AS roles
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create a new user (with bcrypt password and initial role/department assignment)
 */
export const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, department_id, roles } = req.body;

  try {
    const existingUser = await db.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 12);

    // 1. Insert User
    const insertUserText = `
      INSERT INTO users (name, email, password_hash, department_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, name, email, department_id, is_active
    `;
    const userResult = await db.query(insertUserText, [name, email, passwordHash, department_id]);
    const newUser = userResult.rows[0];

    // 2. Assign Roles (if provided)
    if (roles && Array.isArray(roles) && roles.length > 0) {
      // Map roles to ID
      const findRolesText = `SELECT id FROM roles WHERE name = ANY($1) OR id::text = ANY($1)`;
      const rolesIdResult = await db.query(findRolesText, [roles]);
      
      for (const roleRow of rolesIdResult.rows) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, roleRow.id]
        );
      }
    }

    // 3. Log Activity
    await logActivity(req.user.id, 'CREATE', 'users', newUser.id, req);

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Update user basic details
 */
export const updateUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const { name, email, department_id, is_active } = req.body;

  try {
    const updateText = `
      WITH updated AS (
        UPDATE users
        SET name = $1, email = $2, department_id = $3, is_active = $4
        WHERE id = $5
        RETURNING id, name, email, department_id, is_active
      )
      SELECT u.id, u.name, u.email, u.department_id, u.is_active, d.name AS department_name
      FROM updated u
      LEFT JOIN departments d ON u.department_id = d.id;
    `;
    const result = await db.query(updateText, [name, email, department_id, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Log Activity
    await logActivity(req.user.id, 'UPDATE', 'users', id, req);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Soft delete / deactivate user
 */
export const deactivateUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deactivateText = `
      UPDATE users
      SET is_active = FALSE
      WHERE id = $1
      RETURNING id, name, is_active
    `;
    const result = await db.query(deactivateText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Log Activity
    await logActivity(req.user.id, 'DEACTIVATE', 'users', id, req);

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully.',
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id/activity
 * Get activity log for a specific user
 */
export const getUserActivity = async (req, res, next) => {
  const { id } = req.params;

  try {
    const queryText = `
      SELECT id, action, module, record_id, ip_address, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await db.query(queryText, [id]);

    return res.status(200).json({
      success: true,
      logs: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/roles
 * Assign roles to a user
 */
export const assignUserRoles = async (req, res, next) => {
  const { id } = req.params;
  const { roles } = req.body; // Array of role IDs or role names

  if (!roles || !Array.isArray(roles)) {
    return res.status(400).json({ success: false, message: 'Roles array is required.' });
  }

  try {
    // 1. Delete existing roles
    await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);

    // 2. Fetch role IDs for insertion
    const findRolesText = `SELECT id FROM roles WHERE id::text = ANY($1) OR name = ANY($1)`;
    const rolesResult = await db.query(findRolesText, [roles]);

    // 3. Insert new roles
    for (const roleRow of rolesResult.rows) {
      await db.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [id, roleRow.id]
      );
    }

    // Log Activity
    await logActivity(req.user.id, 'ASSIGN_ROLES', 'users', id, req);

    return res.status(200).json({
      success: true,
      message: 'User roles updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/departments
 * List all departments
 */
export const getDepartments = async (req, res, next) => {
  try {
    const result = await db.query(`SELECT id, name FROM departments ORDER BY name ASC`);
    return res.status(200).json({
      success: true,
      departments: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/departments
 * Create a new department
 */
export const createDepartment = async (req, res, next) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Department name is required.' });
  }

  try {
    const insertText = `
      INSERT INTO departments (name) VALUES ($1)
      RETURNING id, name
    `;
    const result = await db.query(insertText, [name.trim()]);
    const newDept = result.rows[0];

    // Log Activity
    await logActivity(req.user.id, 'CREATE', 'departments', newDept.id, req);

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department: newDept
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles
 * List all roles with users count
 */
export const getRoles = async (req, res, next) => {
  try {
    const queryText = `
      SELECT r.id, r.name, COUNT(DISTINCT ur.user_id)::int AS user_count,
             COALESCE(
               (SELECT json_agg(json_build_object('module_name', p.module_name, 'action', p.action))
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = r.id), '[]'
             ) AS permissions
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id, r.name
      ORDER BY r.name ASC
    `;
    const result = await db.query(queryText);

    return res.status(200).json({
      success: true,
      roles: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/roles
 * Create a new role
 */
export const createRole = async (req, res, next) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: 'Role name is required.' });
  }

  try {
    const insertText = `
      INSERT INTO roles (name) VALUES ($1)
      RETURNING id, name
    `;
    const result = await db.query(insertText, [name.trim()]);
    const newRole = result.rows[0];

    // Log Activity
    await logActivity(req.user.id, 'CREATE', 'roles', newRole.id, req);

    return res.status(201).json({
      success: true,
      message: 'Role created successfully.',
      role: newRole
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/roles/:id/permissions
 * Set permissions for a role
 */
export const setRolePermissions = async (req, res, next) => {
  const { id } = req.params;
  const { permissions } = req.body; // Array of objects [{ module_name: 'sales', action: 'view' }, ...]

  if (!permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'Permissions array is required.' });
  }

  try {
    // 1. Delete existing role permissions
    await db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

    if (permissions.length === 0) {
      return res.status(200).json({ success: true, message: 'All permissions revoked for this role.' });
    }

    // 2. Fetch correct permission IDs for combinations
    // Construct lookup map
    const allPermissionsRes = await db.query(`SELECT id, module_name, action FROM permissions`);
    const permMap = {};
    allPermissionsRes.rows.forEach(p => {
      permMap[`${p.module_name}:${p.action}`] = p.id;
    });

    // 3. Link matching permissions to the role
    for (const p of permissions) {
      const key = `${p.module_name}:${p.action}`;
      const permId = permMap[key];

      if (permId) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, permId]
        );
      }
    }

    // Log Activity
    await logActivity(req.user.id, 'UPDATE_PERMISSIONS', 'roles', id, req);

    return res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/activity-logs
 * Paginated system-wide activity logs (Admin only)
 */
export const getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const moduleFilter = req.query.module || null;
    const userIdFilter = req.query.userId || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    let whereClauses = [];
    const queryParams = [];

    if (moduleFilter) {
      queryParams.push(moduleFilter);
      whereClauses.push(`al.module = $${queryParams.length}`);
    }

    if (userIdFilter) {
      queryParams.push(userIdFilter);
      whereClauses.push(`al.user_id = $${queryParams.length}`);
    }

    if (startDate) {
      queryParams.push(startDate);
      whereClauses.push(`al.created_at >= $${queryParams.length}::timestamptz`);
    }

    if (endDate) {
      queryParams.push(endDate);
      // add 1 day to make range inclusive
      whereClauses.push(`al.created_at <= $${queryParams.length}::timestamptz`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM activity_logs al
      ${whereString}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Data query
    let queryText = `
      SELECT al.id, al.action, al.module, al.record_id, al.ip_address, al.created_at,
             u.name AS user_name, u.email AS user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereString}
      ORDER BY al.created_at DESC
    `;

    queryParams.push(limit, offset);
    queryText += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const logsResult = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/pending
 * List all pending users (is_active = FALSE)
 */
export const getPendingUsers = async (req, res, next) => {
  try {
    const queryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_active = FALSE
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(queryText);

    return res.status(200).json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/approve
 * Approve pending user, set is_active = TRUE and assign role (+ optional department)
 */
export const approveUser = async (req, res, next) => {
  const { id } = req.params;
  const { role_id, role_name, department_id } = req.body;

  try {
    // 1. Verify user exists
    const userCheck = await db.query(`SELECT id, email, name FROM users WHERE id = $1`, [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // 2. Update is_active to TRUE (and department_id if provided)
    let updateQuery = `UPDATE users SET is_active = TRUE`;
    const queryParams = [id];

    if (department_id) {
      queryParams.push(department_id);
      updateQuery += `, department_id = $${queryParams.length}`;
    }

    updateQuery += ` WHERE id = $1 RETURNING id, name, email, is_active, department_id;`;
    const updateResult = await db.query(updateQuery, queryParams);
    const updatedUser = updateResult.rows[0];

    // 3. Assign role if specified
    const targetRole = role_id || role_name;
    if (targetRole) {
      const findRoleText = `SELECT id FROM roles WHERE id::text = $1 OR name = $1`;
      const roleResult = await db.query(findRoleText, [targetRole]);

      if (roleResult.rows.length > 0) {
        const selectedRoleId = roleResult.rows[0].id;
        await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
        await db.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, selectedRoleId]
        );
      }
    }

    // 4. Log Activity
    await logActivity(req.user.id, 'APPROVE_USER', 'users', id, req);

    return res.status(200).json({
      success: true,
      message: 'User approved and activated successfully.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id/reject
 * Reject and delete a pending user registration
 */
export const rejectUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userCheck = await db.query(`SELECT id, email, name FROM users WHERE id = $1`, [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Delete user (cascade handles user_roles)
    await db.query(`DELETE FROM users WHERE id = $1`, [id]);

    // Log Activity
    await logActivity(req.user.id, 'REJECT_USER', 'users', id, req);

    return res.status(200).json({
      success: true,
      message: 'User registration rejected and user account removed.'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  getUserActivity,
  assignUserRoles,
  getDepartments,
  createDepartment,
  getRoles,
  createRole,
  setRolePermissions,
  getActivityLogs,
  getPendingUsers,
  approveUser,
  rejectUser
};
