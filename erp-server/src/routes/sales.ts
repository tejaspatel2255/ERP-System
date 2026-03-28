import express from 'express';
import jwt from 'jsonwebtoken';
import { SalesService } from '../services/SalesService';
import { validate } from '../middlewares/validate';
import { createSaleSchema } from 'erp-shared';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify token (Reused)
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

router.get('/', async (req, res) => {
    const sales = await SalesService.getAllSales();
    res.json(sales);
});

router.post('/', validate(createSaleSchema), async (req, res) => {
    const { customerId, items, status } = req.body;
    const io = (req as any).io;
    const newSale = await SalesService.createSale(customerId, items, status, io);
    res.status(201).json(newSale);
});

export default router;
