import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.get('/stats', verifyToken, async (req: any, res: any) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Sales Data (Last 7 Days)
        const { data: sales, error: salesErr } = await supabase
            .from('sales')
            .select('date, totalAmount')
            .gte('date', sevenDaysAgo.toISOString());

        if (salesErr) throw salesErr;

        // 2. Purchase Data (Last 7 Days)
        const { data: purchases, error: purchasesErr } = await supabase
            .from('purchases')
            .select('date, totalAmount')
            .gte('date', sevenDaysAgo.toISOString());

        if (purchasesErr) throw purchasesErr;

        // 3. Low Stock Alerts
        const { data: products, error: productsErr } = await supabase
            .from('products')
            .select('id, name, stock, minLevel');

        if (productsErr) throw productsErr;

        const lowStockItems = (products || []).filter((p: any) => Number(p.stock) <= Number(p.minLevel));

        // 4. Totals
        const { data: allSales, error: allSalesErr } = await supabase
            .from('sales')
            .select('totalAmount');

        if (allSalesErr) throw allSalesErr;

        const { data: allPurchases, error: allPurchasesErr } = await supabase
            .from('purchases')
            .select('totalAmount');

        if (allPurchasesErr) throw allPurchasesErr;

        // Group by YYYY-MM-DD
        const salesGroup: Record<string, number> = {};
        (sales || []).forEach((s: any) => {
            const dateStr = s.date.slice(0, 10);
            salesGroup[dateStr] = (salesGroup[dateStr] || 0) + Number(s.totalAmount);
        });

        const purchaseGroup: Record<string, number> = {};
        (purchases || []).forEach((p: any) => {
            const dateStr = p.date.slice(0, 10);
            purchaseGroup[dateStr] = (purchaseGroup[dateStr] || 0) + Number(p.totalAmount);
        });

        const salesFormatted = Object.entries(salesGroup)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const purchasesFormatted = Object.entries(purchaseGroup)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalSalesSum = (allSales || []).reduce((sum, s: any) => sum + Number(s.totalAmount), 0);
        const totalPurchasesSum = (allPurchases || []).reduce((sum, p: any) => sum + Number(p.totalAmount), 0);

        res.json({
            sales: salesFormatted,
            purchases: purchasesFormatted,
            alerts: lowStockItems.map((p: any) => ({
                id: p.id,
                item: p.name,
                currentStock: Number(p.stock),
                minLevel: Number(p.minLevel),
            })),
            alertCount: lowStockItems.length,
            totals: {
                sales: totalSalesSum,
                purchases: totalPurchasesSum,
            },
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
