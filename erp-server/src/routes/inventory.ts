import express from 'express';
import jwt from 'jsonwebtoken';
import StoreLedger from '../models/StoreLedger';
import Alert from '../models/Alert';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware (Reused, should be extracted ideally)
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

// GET /api/inventory/ledger
router.get('/ledger', async (req, res) => {
    try {
        const ledger = await StoreLedger.find()
            .populate('product', 'name sku')
            .sort({ date: -1 })
            .limit(100); // Limit correctly for now
        res.json(ledger);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/inventory/alerts
router.get('/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find({ isRead: false })
            .sort({ createdAt: -1 });
        res.json(alerts);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/inventory/alerts/:id/read
router.post('/alerts/:id/read', async (req, res) => {
    try {
        await Alert.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;
