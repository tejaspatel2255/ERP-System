import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getQuotations,
  createQuotation,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
  convertQuotationToOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getInvoices,
  createInvoiceFromOrder,
  getInvoiceById,
  updateInvoiceStatus,
  recordPayment,
  getPayments,
  getSummaryReport,
  getByCustomerReport,
  getByMonthReport
} from '../controllers/salesController.js';

const router = express.Router();

// Verify token for all sales endpoints
router.use(verifyToken);

// ==========================================
// CUSTOMERS
// ==========================================
router.get('/customers', requirePermission('sales', 'view'), getCustomers);
router.post('/customers', requirePermission('sales', 'create'), createCustomer);
router.get('/customers/:id', requirePermission('sales', 'view'), getCustomerById);
router.put('/customers/:id', requirePermission('sales', 'edit'), updateCustomer);
router.delete('/customers/:id', requirePermission('sales', 'delete'), deleteCustomer);

// ==========================================
// QUOTATIONS
// ==========================================
router.get('/quotations', requirePermission('sales', 'view'), getQuotations);
router.post('/quotations', requirePermission('sales', 'create'), createQuotation);
router.get('/quotations/:id', requirePermission('sales', 'view'), getQuotationById);
router.put('/quotations/:id', requirePermission('sales', 'edit'), updateQuotation);
router.delete('/quotations/:id', requirePermission('sales', 'delete'), deleteQuotation);
router.patch('/quotations/:id/status', requirePermission('sales', 'edit'), updateQuotationStatus);
router.post('/quotations/:id/convert', requirePermission('sales', 'edit'), convertQuotationToOrder);

// ==========================================
// SALES ORDERS
// ==========================================
router.get('/orders', requirePermission('sales', 'view'), getOrders);
router.get('/orders/:id', requirePermission('sales', 'view'), getOrderById);
router.patch('/orders/:id/status', requirePermission('sales', 'edit'), updateOrderStatus);

// ==========================================
// INVOICES
// ==========================================
router.get('/invoices', requirePermission('sales', 'view'), getInvoices);
router.post('/invoices', requirePermission('sales', 'create'), createInvoiceFromOrder);
router.get('/invoices/:id', requirePermission('sales', 'view'), getInvoiceById);
router.patch('/invoices/:id/status', requirePermission('sales', 'edit'), updateInvoiceStatus);

// ==========================================
// PAYMENTS
// ==========================================
router.post('/payments', requirePermission('sales', 'create'), recordPayment);
router.get('/payments', requirePermission('sales', 'view'), getPayments);

// ==========================================
// REPORTS
// ==========================================
router.get('/reports/summary', requirePermission('sales', 'view'), getSummaryReport);
router.get('/reports/by-customer', requirePermission('sales', 'view'), getByCustomerReport);
router.get('/reports/by-month', requirePermission('sales', 'view'), getByMonthReport);

export default router;
