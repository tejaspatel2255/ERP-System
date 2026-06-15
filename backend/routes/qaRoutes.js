import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getChecklists, createChecklist, getChecklistById, updateChecklist,
  getTests, createTest, getTestById, submitTestResults, uploadTestReport, approveTest, getPendingApprovals
} from '../controllers/qaController.js';

const router = express.Router();
router.use(verifyToken);

// Checklists
router.get('/checklists', requirePermission('qa', 'view'), getChecklists);
router.post('/checklists', requirePermission('qa', 'create'), createChecklist);
router.get('/checklists/:id', requirePermission('qa', 'view'), getChecklistById);
router.put('/checklists/:id', requirePermission('qa', 'edit'), updateChecklist);

// Tests
router.get('/tests', requirePermission('qa', 'view'), getTests);
router.post('/tests', requirePermission('qa', 'create'), createTest);
router.get('/tests/:id', requirePermission('qa', 'view'), getTestById);
router.post('/tests/:id/results', requirePermission('qa', 'create'), submitTestResults);
router.post('/tests/:id/report', requirePermission('qa', 'create'), uploadTestReport);
router.post('/tests/:id/approve', requirePermission('qa', 'approve'), approveTest);
router.get('/approvals', requirePermission('qa', 'approve'), getPendingApprovals);

export default router;
