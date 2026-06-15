import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getSummary, getActivity, getCharts } from '../controllers/dashboardController.js';

const router = express.Router();

// Dashboard is accessible to all authenticated users — no module-level permission needed.
router.use(verifyToken);

router.get('/summary', getSummary);
router.get('/activity', getActivity);
router.get('/charts', getCharts);

export default router;
