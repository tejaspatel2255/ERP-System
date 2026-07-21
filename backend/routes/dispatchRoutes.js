import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import {
  getPackingSlips,
  createPackingSlip,
  getPackingSlipById,
  getChallans,
  createChallan,
  getChallanById,
  addTransportDetails,
  uploadPOD,
  getDispatchSchedule
} from '../controllers/dispatchController.js';

const router = express.Router();

router.use(verifyToken);

// Packing Slips
router.get('/packing-slips', requirePermission('dispatch', 'view'), getPackingSlips);
router.post('/packing-slips', requirePermission('dispatch', 'create'), createPackingSlip);
router.get('/packing-slips/:id', requirePermission('dispatch', 'view'), getPackingSlipById);

// Challans
router.get('/challans', requirePermission('dispatch', 'view'), getChallans);
router.post('/challans', requirePermission('dispatch', 'create'), createChallan);
router.get('/challans/:id', requirePermission('dispatch', 'view'), getChallanById);
router.post('/challans/:id/transport', requirePermission('dispatch', 'edit'), addTransportDetails);
router.post('/challans/:id/pod', requirePermission('dispatch', 'edit'), upload.single('pod'), uploadPOD);

// Schedule
router.get('/schedule', requirePermission('dispatch', 'view'), getDispatchSchedule);

export default router;
