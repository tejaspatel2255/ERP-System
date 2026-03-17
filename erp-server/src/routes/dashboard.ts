import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify token
const verifyToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user to request
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

import Product from '../models/Product';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';

router.get('/stats', verifyToken, async (req: any, res: any) => {
    try {
        // 1. Sales Data (Last 7 Days)
        const salesData = await Sale.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Purchase Data (Last 7 Days)
        const purchaseData = await Purchase.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Low Stock Alerts
        const lowStockItems = await Product.find({
            $expr: { $lte: ["$stock", "$minLevel"] }
        }).select('name stock minLevel');

        // 4. Totals
        const totalSales = await Sale.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
        const totalPurchases = await Purchase.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);

        // Format for Frontend
        res.json({
            sales: salesData.map(s => ({ date: s._id, amount: s.amount })),
            purchases: purchaseData.map(p => ({ date: p._id, amount: p.amount })),
            alerts: lowStockItems.map(p => ({
                id: p._id,
                item: p.name,
                currentStock: p.stock,
                minLevel: p.minLevel
            })),
            alertCount: lowStockItems.length,
            totals: {
                sales: totalSales[0]?.total || 0,
                purchases: totalPurchases[0]?.total || 0,
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;
