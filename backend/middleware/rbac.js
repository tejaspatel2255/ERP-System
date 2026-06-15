import db from '../models/db.js';

/**
 * Middleware factory to enforce specific module and action permissions
 * @param {string} module - The name of the module (e.g., 'sales', 'inventory')
 * @param {string} action - The action requested (e.g., 'view', 'create', 'edit', 'delete')
 * @returns {Function} Express middleware function
 */
export const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. No user credentials found.'
      });
    }

    const { roles = [], permissions = [] } = req.user;

    // Admin role bypasses all permission checks
    if (roles.includes('Admin')) {
      return next();
    }

    // Check if the user has the required permission
    const hasPermission = permissions.some(
      (perm) => perm.module_name === module && perm.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You do not have permission to perform ${action} on ${module}.`
      });
    }

    next();
  };
};

/**
 * Load all permissions for a user from the database via their roles
 * @param {string} userId - UUID of the user
 * @returns {Promise<Array>} Array of { module_name, action } objects
 */
export const loadUserPermissions = async (userId) => {
  const queryText = `
    SELECT DISTINCT p.module_name, p.action 
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1
  `;
  const result = await db.query(queryText, [userId]);
  return result.rows; // [{ module_name: 'sales', action: 'create' }, ...]
};

export default { requirePermission, loadUserPermissions };
