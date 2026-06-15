import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getVendors,
  createVendor,
  getVendorById,
  updateVendor,
  deleteVendor,
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  updatePurchaseOrderStatus,
  getVendorInvoices,
  createVendorInvoice,
  getVendorInvoiceById,
  updateVendorInvoiceStatus,
  getSpendByVendor,
  getSpendByItem,
  getSpendByMonth,
  getPendingPurchaseOrders
} from '../controllers/purchaseController.js';

const router = express.Router();

// Apply auth middleware for all purchase routes
router.use(verifyToken);

// ==========================================
// VENDORS
// ==========================================
router.get('/vendors', requirePermission('purchase', 'view'), getVendors);
router.post('/vendors', requirePermission('purchase', 'create'), createVendor);
router.get('/vendors/:id', requirePermission('purchase', 'view'), getVendorById);
router.put('/vendors/:id', requirePermission('purchase', 'edit'), updateVendor);
router.delete('/vendors/:id', requirePermission('purchase', 'delete'), deleteVendor);

// ==========================================
// PURCHASE ORDERS
// ==========================================
router.get('/orders', requirePermission('purchase', 'view'), getPurchaseOrders);
router.post('/orders', requirePermission('purchase', 'create'), createPurchaseOrder);
router.get('/orders/:id', requirePermission('purchase', 'view'), getPurchaseOrderById);
router.put('/orders/:id', requirePermission('purchase', 'edit'), updatePurchaseOrder);
router.patch('/orders/:id/submit', requirePermission('purchase', 'edit'), submitPurchaseOrder);
router.patch('/orders/:id/approve', requirePermission('purchase', 'edit'), approvePurchaseOrder);
router.patch('/orders/:id/reject', requirePermission('purchase', 'edit'), rejectPurchaseOrder);
router.patch('/orders/:id/status', requirePermission('purchase', 'edit'), updatePurchaseOrderStatus);

// ==========================================
// VENDOR INVOICES
// ==========================================
router.get('/invoices', requirePermission('purchase', 'view'), getVendorInvoices);
router.post('/invoices', requirePermission('purchase', 'create'), createVendorInvoice);
router.get('/invoices/:id', requirePermission('purchase', 'view'), getVendorInvoiceById);
router.patch('/invoices/:id/status', requirePermission('purchase', 'edit'), updateVendorInvoiceStatus);

// ==========================================
// ANALYTICS / REPORTS
// ==========================================
router.get('/analytics/by-vendor', requirePermission('purchase', 'view'), getSpendByVendor);
router.get('/analytics/by-item', requirePermission('purchase', 'view'), getSpendByItem);
router.get('/analytics/by-month', requirePermission('purchase', 'view'), getSpendByMonth);
router.get('/analytics/pending-pos', requirePermission('purchase', 'view'), getPendingPurchaseOrders);

export default router;
