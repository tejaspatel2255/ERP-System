import express from 'express';
import jwt from 'jsonwebtoken';
import { ProductionService } from '../services/ProductionService';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const verifyToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid Token' });
    }
};

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
