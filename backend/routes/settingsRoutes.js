import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', requirePermission('auth', 'view'), getSettings);
router.put('/', requirePermission('auth', 'edit'), updateSettings);

export default router;
