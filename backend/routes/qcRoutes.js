import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getRawMaterialQC, createRawMaterialQC, approveRawMaterialQC,
  getInProcessQC, createInProcessQC,
  getFinalQC, createFinalQC, approveFinalQC,
  getNCRs, raiseNCR, updateNCR
} from '../controllers/qcController.js';

const router = express.Router();
router.use(verifyToken);

// QC Raw Material
router.get('/raw-material', requirePermission('qc', 'view'), getRawMaterialQC);
router.post('/raw-material', requirePermission('qc', 'create'), createRawMaterialQC);
router.post('/raw-material/:id/approve', requirePermission('qc', 'edit'), approveRawMaterialQC);

// QC In-Process
router.get('/in-process', requirePermission('qc', 'view'), getInProcessQC);
router.post('/in-process', requirePermission('qc', 'create'), createInProcessQC);

// QC Final
router.get('/final', requirePermission('qc', 'view'), getFinalQC);
router.post('/final', requirePermission('qc', 'create'), createFinalQC);
router.post('/final/:id/approve', requirePermission('qc', 'edit'), approveFinalQC);

// NCR
router.get('/ncr', requirePermission('qc', 'view'), getNCRs);
router.post('/ncr', requirePermission('qc', 'create'), raiseNCR);
router.put('/ncr/:id', requirePermission('qc', 'edit'), updateNCR);

export default router;
