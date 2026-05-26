import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { supabase } from '../lib/supabase';
import { AuditLogger } from '../utils/auditLogger';

const router = express.Router();

router.use(verifyToken);

// GET /api/inventory/ledger
router.get('/ledger', async (req, res) => {
    try {
        const { data: ledger, error } = await supabase
            .from('store_ledger')
            .select(`
                *,
                product:product (name, sku)
            `)
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json(ledger.map((l: any) => ({ ...l, _id: l.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// GET /api/inventory/alerts
router.get('/alerts', async (req, res) => {
    try {
        const { data: alerts, error } = await supabase
            .from('alerts')
            .select('*')
            .eq('isRead', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(alerts.map((a: any) => ({ ...a, _id: a.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// POST /api/inventory/alerts/:id/read
router.post('/alerts/:id/read', async (req: any, res: any) => {
    try {
        const { error } = await supabase
            .from('alerts')
            .update({ isRead: true })
            .eq('id', req.params.id);

        if (error) throw error;

        await AuditLogger.log(req.user.id, req.user.username, 'MARK_ALERT_READ', 'Alert', req.params.id);

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
