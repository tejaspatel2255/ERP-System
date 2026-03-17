import express from 'express';
import jwt from 'jsonwebtoken';
import { AnalyticsService } from '../services/analytics';
import Product from '../models/Product';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware (Reused)
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

// GET Forecast for a specific product
router.get('/forecast/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const forecast = await AnalyticsService.getProductForecast(productId);
        res.json(forecast);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET Forecast for ALL products (For Smart Restock Dashboard)
// Warning: Heavy operation, pagination recommended in production
router.get('/restock-recommendations', async (req, res) => {
    try {
        const products = await Product.find({}, '_id'); // Get all IDs
        const forecasts = await Promise.all(
            products.map(p => AnalyticsService.getProductForecast(p._id.toString()))
        );

        // Filter only those needing attention
        const recommendations = forecasts.filter(f =>
            f.recommendation.startsWith('Critical') ||
            f.recommendation.startsWith('High') ||
            f.recommendation.startsWith('Medium')
        );

        res.json(recommendations);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
