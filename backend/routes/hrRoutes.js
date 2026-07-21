import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  getAttendance,
  markAttendance,
  correctAttendance,
  getAttendanceSummary,
  getLeaveTypes,
  createLeaveType,
  getLeaveApplications,
  applyLeave,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  getSelfAttendance,
  getSelfLeaveBalance,
  selfApplyLeave,
  getSelfLeaveApplications,
  getTrainingSessions,
  createTrainingSession,
  getTrainingSessionById,
  markTrainingAttendance
} from '../controllers/hrController.js';

const router = express.Router();

router.use(verifyToken);

// Employees
router.get('/employees', requirePermission('hr', 'view'), getEmployees);
router.post('/employees', requirePermission('hr', 'create'), createEmployee);
router.get('/employees/:id', requirePermission('hr', 'view'), getEmployeeById);
router.put('/employees/:id', requirePermission('hr', 'edit'), updateEmployee);

// Attendance
router.get('/attendance', requirePermission('hr', 'view'), getAttendance);
router.post('/attendance', requirePermission('hr', 'edit'), markAttendance);
router.put('/attendance/:id', requirePermission('hr', 'edit'), correctAttendance);
router.get('/attendance/summary/:empId/:year/:month', requirePermission('hr', 'view'), getAttendanceSummary);

// Leave
router.get('/leave-types', getLeaveTypes);
router.post('/leave-types', requirePermission('hr', 'create'), createLeaveType);
router.get('/leave-applications', requirePermission('hr', 'view'), getLeaveApplications);
router.post('/leave-applications', requirePermission('hr', 'edit'), applyLeave);
router.patch('/leave-applications/:id/approve', requirePermission('hr', 'approve'), approveLeave);
router.patch('/leave-applications/:id/reject', requirePermission('hr', 'approve'), rejectLeave);
router.get('/leave-balance/:empId', requirePermission('hr', 'view'), getLeaveBalance);

// Self Service
router.get('/self/attendance', getSelfAttendance);
router.get('/self/leave-balance', getSelfLeaveBalance);
router.post('/self/leave-apply', selfApplyLeave);
router.get('/self/leave-applications', getSelfLeaveApplications);

// Training
router.get('/training', requirePermission('hr', 'view'), getTrainingSessions);
router.post('/training', requirePermission('hr', 'create'), createTrainingSession);
router.get('/training/:id', requirePermission('hr', 'view'), getTrainingSessionById);
router.post('/training/:id/attendance', requirePermission('hr', 'edit'), markTrainingAttendance);

export default router;
