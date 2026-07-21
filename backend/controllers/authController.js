import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../models/db.js';
import { generateTokens } from '../middleware/auth.js';
import { loadUserPermissions } from '../middleware/rbac.js';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be defined in .env');
}

// SameSite=None (+ Secure=true) is required for cross-site cookie delivery when
// the frontend (Vercel) and backend (Render) are on different domains.
// SameSite=Strict would silently drop the cookie on every cross-site fetch,
// breaking token refresh in real browsers even though HttpOnly/Secure are correct.
// In development we use 'lax' so http://localhost still works without HTTPS.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',       // required for SameSite=None
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

/**
 * Handle user login
 */
export const login = async (req, res, next) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 1. Fetch user by email
    const userQueryText = `
      SELECT u.id, u.name, u.email, u.password_hash, u.is_active, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = $1
    `;
    const userResult = await db.query(userQueryText, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2. Check if user account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is pending admin approval. An administrator must approve your account and assign a role before you can access the system.'
      });
    }

    // 3. Compare password hash
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 4. Fetch user roles
    const rolesQueryText = `
      SELECT r.name 
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const rolesResult = await db.query(rolesQueryText, [user.id]);
    const roles = rolesResult.rows.map((r) => r.name);

    // 5. Fetch user permissions
    const permissions = await loadUserPermissions(user.id);

    // 6. Generate access & refresh tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      department_id: user.department_id,
      roles,
      permissions
    });

    // 7. Store the refresh token in the database (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const insertTokenText = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `;
    await db.query(insertTokenText, [user.id, refreshToken, expiresAt]);

    // 8. Set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    // 9. Return accessToken and sanitized user info
    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department_id: user.department_id,
        department_name: user.department_name,
        roles,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh expired access token
 */
export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  try {
    // 1. Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // 2. Verify token exists in database and is not revoked
    const tokenQueryText = `
      SELECT id, user_id FROM refresh_tokens
      WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()
    `;
    const tokenResult = await db.query(tokenQueryText, [refreshToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token.' });
    }

    const tokenRecord = tokenResult.rows[0];

    // 3. Fetch latest user details and verify active status
    const userQueryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;
    const userResult = await db.query(userQueryText, [tokenRecord.user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'User account has been deactivated.' });
    }

    // 4. Fetch latest user roles & permissions
    const rolesQueryText = `
      SELECT r.name 
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const rolesResult = await db.query(rolesQueryText, [user.id]);
    const roles = rolesResult.rows.map((r) => r.name);

    const permissions = await loadUserPermissions(user.id);

    // 5. Generate new access token
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      department_id: user.department_id,
      roles,
      permissions
    });

    return res.status(200).json({
      success: true,
      accessToken: tokens.accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke refresh token and logout
 */
export const logout = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  try {
    if (refreshToken) {
      // Revoke the refresh token in DB
      const revokeQueryText = `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE token = $1
      `;
      await db.query(revokeQueryText, [refreshToken]);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',       // required for SameSite=None
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 */
export const me = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user details
    const userQueryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;
    const userResult = await db.query(userQueryText, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is pending admin approval.'
      });
    }

    // Fetch roles
    const rolesQueryText = `
      SELECT r.name 
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const rolesResult = await db.query(rolesQueryText, [user.id]);
    const roles = rolesResult.rows.map((r) => r.name);

    // Fetch permissions
    const permissions = await loadUserPermissions(user.id);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department_id: user.department_id,
        department_name: user.department_name,
        roles,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user registration
 */
export const register = async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // 1. Check if email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    // 2. Hash password with bcryptjs saltRounds 12
    const hashedPassword = await bcryptjs.hash(password, 12);

    // 3. Insert new user into users table with is_active = false (pending approval)
    const insertUserText = `
      INSERT INTO users (name, email, password_hash, is_active)
      VALUES ($1, $2, $3, false)
      RETURNING id, name, email;
    `;
    const userResult = await db.query(insertUserText, [name, email, hashedPassword]);
    const newUser = userResult.rows[0];

    // 4. Return success message (no tokens, pending approval)
    return res.status(201).json({
      success: true,
      code: 'ACCOUNT_PENDING_APPROVAL',
      message: 'Your account has been created and is pending admin approval. You will be notified once an administrator approves your account.',
      userId: newUser.id,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message
    });
  }
};

export const seedAdmin = async (req, res, next) => {
  try {
    // 1. Seed 10 departments
    const departments = [
      'Sales', 'Purchase', 'Store', 'Production', 
      'Maintenance', 'QA', 'QC', 'Dispatch', 'HR', 'Design'
    ];
    const deptMap = {};
    for (const name of departments) {
      const dbRes = await db.query(`
        INSERT INTO departments (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [name]);
      deptMap[name] = dbRes.rows[0].id;
    }

    // 2. Seed 3 roles
    const roles = ['Admin', 'Manager', 'Staff'];
    const roleMap = {};
    for (const name of roles) {
      const dbRes = await db.query(`
        INSERT INTO roles (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [name]);
      roleMap[name] = dbRes.rows[0].id;
    }

    // 3. Seed 1 admin user: name="Admin", email="admin@erp.com", password="Admin@123"
    const passwordHash = await bcryptjs.hash('Admin@123', 12);
    const adminDeptId = deptMap['Management'] || deptMap['HR'] || Object.values(deptMap)[0];
    const userRes = await db.query(`
      INSERT INTO users (name, email, password_hash, is_active, department_id)
      VALUES ('Admin', 'admin@erp.com', $1, true, $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
      RETURNING id;
    `, [passwordHash, adminDeptId]);
    const adminUserId = userRes.rows[0].id;

    // 4. Link admin user to Admin role
    const adminRoleId = roleMap['Admin'];
    await db.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [adminUserId, adminRoleId]);

    // 5. Seed all permissions for all modules for Admin role
    const modules = [
      'sales', 'purchase', 'inventory', 'store', 'production', 
      'maintenance', 'qa', 'qc', 'dispatch', 'hr', 'design', 
      'settings', 'users', 'auth', 'dashboard'
    ];
    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    for (const moduleName of modules) {
      for (const action of actions) {
        // Insert permission
        const permRes = await db.query(`
          INSERT INTO permissions (module_name, action)
          VALUES ($1, $2)
          ON CONFLICT (module_name, action) DO UPDATE SET module_name = EXCLUDED.module_name
          RETURNING id;
        `, [moduleName, action]);
        const permId = permRes.rows[0].id;

        // Associate with Admin role
        await db.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [adminRoleId, permId]);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Admin seeding completed successfully!',
      user: {
        name: 'Admin',
        email: 'admin@erp.com'
      }
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin seeding failed.',
      error: error.message
    });
  }
};

export default { login, refresh, logout, me, register, seedAdmin };

