import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { AnalyticsService } from '../services/analytics';
import { supabase } from '../lib/supabase';

const router = express.Router();

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

// GET Forecast for ALL products
router.get('/restock-recommendations', async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id');

        if (error) throw error;

        const forecasts = await Promise.all(
            (products || []).map((p: any) => AnalyticsService.getProductForecast(p.id))
        );

        const recommendations = forecasts.filter(
            (f) =>
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
