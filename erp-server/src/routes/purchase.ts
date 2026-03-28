import express from 'express';
import jwt from 'jsonwebtoken';
import { PurchaseService } from '../services/PurchaseService';

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

router.get('/', async (req, res) => {
    const purchases = await PurchaseService.getAllPurchases();
    res.json(purchases);
});

router.post('/', async (req, res) => {
    const { vendorName, items } = req.body;
    const newPurchase = await PurchaseService.createPurchase(vendorName, items);
    res.status(201).json(newPurchase);
});

export default router;
