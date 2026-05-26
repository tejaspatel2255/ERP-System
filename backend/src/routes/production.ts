import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { ProductionService } from '../services/ProductionService';

const router = express.Router();

router.use(verifyToken);

// GET /api/production/bom
router.get('/bom', async (req, res) => {
    const boms = await ProductionService.getAllBOMs();
    res.json(boms);
});

// POST /api/production/bom
router.post('/bom', async (req, res) => {
    const bom = await ProductionService.createBOM(req.body);
    res.status(201).json(bom);
});

// GET /api/production/work-orders
router.get('/work-orders', async (req, res) => {
    const orders = await ProductionService.getAllWorkOrders();
    res.json(orders);
});

// POST /api/production/work-orders
router.post('/work-orders', async (req, res) => {
    const workOrder = await ProductionService.createWorkOrder(req.body);
    res.status(201).json(workOrder);
});

// PUT /api/production/work-orders/:id/status
router.put('/work-orders/:id/status', async (req, res) => {
    const workOrder = await ProductionService.updateWorkOrderStatus(req.params.id, req.body.status);
    res.json(workOrder);
});

export default router;
