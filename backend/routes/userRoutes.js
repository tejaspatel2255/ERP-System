import express from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
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
  getActivityLogs
} from '../controllers/userController.js';

const router = express.Router();

// Input Validations
const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('department_id').isUUID().withMessage('Valid department ID is required.')
];

const updateUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('department_id').isUUID().withMessage('Valid department ID is required.'),
  body('is_active').isBoolean().withMessage('is_active must be a boolean.')
];

const createDeptValidation = [
  body('name').trim().notEmpty().withMessage('Department name is required.')
];

const createRoleValidation = [
  body('name').trim().notEmpty().withMessage('Role name is required.')
];

// All routes here require a valid JWT token
router.use(verifyToken);

// User Routes
router.get('/users', requirePermission('auth', 'view'), getUsers);
router.post('/users', requirePermission('auth', 'create'), createUserValidation, createUser);
router.get('/users/:id', requirePermission('auth', 'view'), getUserById);
router.put('/users/:id', requirePermission('auth', 'edit'), updateUserValidation, updateUser);
router.delete('/users/:id', requirePermission('auth', 'delete'), deactivateUser);
router.get('/users/:id/activity', requirePermission('auth', 'view'), getUserActivity);
router.post('/users/:id/roles', requirePermission('auth', 'edit'), assignUserRoles);

// Department Routes
router.get('/departments', requirePermission('auth', 'view'), getDepartments);
router.post('/departments', requirePermission('auth', 'create'), createDeptValidation, createDepartment);

// Role & Permission Routes
router.get('/roles', requirePermission('auth', 'view'), getRoles);
router.post('/roles', requirePermission('auth', 'create'), createRoleValidation, createRole);
router.put('/roles/:id/permissions', requirePermission('auth', 'edit'), setRolePermissions);

// Activity Logs Routes
router.get('/activity-logs', requirePermission('auth', 'view'), getActivityLogs);

export default router;
