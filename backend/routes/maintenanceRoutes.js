import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAssets, createAsset, getAssetById, updateAsset,
  getSchedules, createSchedule, updateSchedule, logScheduleCompletion,
  getIssues, createIssue, getIssueById, updateIssue
} from '../controllers/maintenanceController.js';

const router = express.Router();
router.use(verifyToken);

// Assets
router.get('/assets', requirePermission('maintenance', 'view'), getAssets);
router.post('/assets', requirePermission('maintenance', 'create'), createAsset);
router.get('/assets/:id', requirePermission('maintenance', 'view'), getAssetById);
router.put('/assets/:id', requirePermission('maintenance', 'edit'), updateAsset);

// Schedules
router.get('/schedules', requirePermission('maintenance', 'view'), getSchedules);
router.post('/schedules', requirePermission('maintenance', 'create'), createSchedule);
router.put('/schedules/:id', requirePermission('maintenance', 'edit'), updateSchedule);
router.post('/schedules/:id/log', requirePermission('maintenance', 'edit'), logScheduleCompletion);

// Issues
router.get('/issues', requirePermission('maintenance', 'view'), getIssues);
router.post('/issues', requirePermission('maintenance', 'create'), createIssue);
router.get('/issues/:id', requirePermission('maintenance', 'view'), getIssueById);
router.put('/issues/:id', requirePermission('maintenance', 'edit'), updateIssue);

export default router;
