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
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
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

    // 8. Return tokens and sanitized user info
    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
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
  const { refreshToken } = req.body;

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
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required for logout.' });
  }

  try {
    // Revoke the refresh token in DB
    const revokeQueryText = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token = $1
    `;
    await db.query(revokeQueryText, [refreshToken]);

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

export default { login, refresh, logout, me };
