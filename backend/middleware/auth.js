import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_default_jwt_secret_key_change_me_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_default_jwt_refresh_secret_key_change_me_in_production';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET or JWT_REFRESH_SECRET is not defined. Using fallback keys for testing.');
}

/**
 * Middleware to verify authorization token from headers
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach decoded user info (including id, email, roles, permissions) to req.user
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid or expired token.'
    });
  }
};

/**
 * Generate Access and Refresh JWT tokens for a user
 * @param {Object} user - User object containing id, email, name, department_id, roles, and permissions
 * @returns {Object} Access and Refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    department_id: user.department_id,
    roles: user.roles || [],
    permissions: user.permissions || []
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m'
  });

  const refreshPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    department_id: user.department_id
  };

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};

export default { verifyToken, generateTokens };
