import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getCategories, createCategory,
  getItems, createItem, getItemById, updateItem, deleteItem,
  getGRNs, createGRN, getGRNById,
  issueStock, getIssues, getIssueById,
  getStockLedger, getStockPosition, getStockAlerts
} from '../controllers/storeController.js';

const router = express.Router();
router.use(verifyToken);

// ── CATEGORIES ──────────────────────────────────────────────────────────────
router.get('/categories', requirePermission('store', 'view'), getCategories);
router.post('/categories', requirePermission('store', 'create'), createCategory);

// ── ITEM MASTER ──────────────────────────────────────────────────────────────
router.get('/items', requirePermission('store', 'view'), getItems);
router.post('/items', requirePermission('store', 'create'), createItem);
router.get('/items/:id', requirePermission('store', 'view'), getItemById);
router.put('/items/:id', requirePermission('store', 'edit'), updateItem);
router.delete('/items/:id', requirePermission('store', 'delete'), deleteItem);

// ── GRN (STOCK IN) ───────────────────────────────────────────────────────────
router.get('/grn', requirePermission('store', 'view'), getGRNs);
router.post('/grn', requirePermission('store', 'create'), createGRN);
router.get('/grn/:id', requirePermission('store', 'view'), getGRNById);

// ── STOCK ISSUE (STOCK OUT) ──────────────────────────────────────────────────
router.post('/issue', requirePermission('store', 'create'), issueStock);
router.get('/issues', requirePermission('store', 'view'), getIssues);
router.get('/issues/:id', requirePermission('store', 'view'), getIssueById);

// ── STOCK LEDGER ─────────────────────────────────────────────────────────────
router.get('/ledger/:itemId', requirePermission('store', 'view'), getStockLedger);
router.get('/stock-position', requirePermission('store', 'view'), getStockPosition);

// ── ALERTS ────────────────────────────────────────────────────────────────────
router.get('/alerts', requirePermission('store', 'view'), getStockAlerts);

export default router;
