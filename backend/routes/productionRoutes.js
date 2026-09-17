import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getBOMs, createBOM, getBOMById, updateBOM, activateBOM, deleteBOM,
  getWorkOrders, createWorkOrder, createWorkOrderFromSalesOrder, getWorkOrderById, startWorkOrder, completeWorkOrder, cancelWorkOrder,
  issueToWorkOrder, getConsumptionByWO,
  getCosting, updateCosting
} from '../controllers/productionController.js';

const router = express.Router();
router.use(verifyToken);

// BOM
router.get('/bom', requirePermission('production', 'view'), getBOMs);
router.post('/bom', requirePermission('production', 'create'), createBOM);
router.get('/bom/:id', requirePermission('production', 'view'), getBOMById);
router.put('/bom/:id', requirePermission('production', 'edit'), updateBOM);
router.patch('/bom/:id/activate', requirePermission('production', 'edit'), activateBOM);
router.delete('/bom/:id', requirePermission('production', 'delete'), deleteBOM);

// Work Orders
router.get('/work-orders', requirePermission('production', 'view'), getWorkOrders);
router.post('/work-orders', requirePermission('production', 'create'), createWorkOrder);
router.post('/work-orders/from-sales-order/:soId', requirePermission('production', 'create'), createWorkOrderFromSalesOrder);
router.get('/work-orders/:id', requirePermission('production', 'view'), getWorkOrderById);
router.patch('/work-orders/:id/start', requirePermission('production', 'edit'), startWorkOrder);
router.patch('/work-orders/:id/complete', requirePermission('production', 'edit'), completeWorkOrder);
router.patch('/work-orders/:id/cancel', requirePermission('production', 'edit'), cancelWorkOrder);

// Material Consumption
router.post('/consumption', requirePermission('production', 'create'), issueToWorkOrder);
router.get('/consumption/:woId', requirePermission('production', 'view'), getConsumptionByWO);

// Costing
router.get('/costing/:woId', requirePermission('production', 'view'), getCosting);
router.post('/costing/:woId', requirePermission('production', 'edit'), updateCosting);

export default router;
