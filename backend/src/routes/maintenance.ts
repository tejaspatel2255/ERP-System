import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.use(verifyToken);

// ================= ASSETS =================

// GET /api/maintenance/assets
router.get('/assets', async (req, res) => {
    try {
        const { data: assets, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(assets.map((a: any) => ({ ...a, _id: a.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// POST /api/maintenance/assets
router.post('/assets', async (req, res) => {
    try {
        const { data: asset, error } = await supabase
            .from('assets')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...asset, _id: asset.id });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Failed to create asset' });
    }
});

// ================= LOGS =================

// GET /api/maintenance/logs
router.get('/logs', async (req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from('maintenance_logs')
            .select(`
                *,
                asset:asset (name, "serialNumber")
            `)
            .order('scheduledDate', { ascending: true });

        if (error) throw error;

        res.json(logs.map((l: any) => ({ ...l, _id: l.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// POST /api/maintenance/logs
router.post('/logs', async (req, res) => {
    try {
        const { data: log, error } = await supabase
            .from('maintenance_logs')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;

        if (log.status === 'In Progress' || log.type === 'Issue') {
            await supabase
                .from('assets')
                .update({ status: 'Under Maintenance' })
                .eq('id', log.asset);
        }

        res.status(201).json({ ...log, _id: log.id });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Failed to create log' });
    }
});

// PUT /api/maintenance/logs/:id/status
router.put('/logs/:id/status', async (req, res) => {
    try {
        const { status, cost, completionDate } = req.body;

        const { data: log, error: fetchErr } = await supabase
            .from('maintenance_logs')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !log) throw new Error('Log not found');

        const updates: any = { status };
        if (cost !== undefined) updates.cost = cost;
        if (completionDate !== undefined) updates.completionDate = completionDate;

        const { data: updatedLog, error: updateErr } = await supabase
            .from('maintenance_logs')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        if (status === 'In Progress') {
            await supabase
                .from('assets')
                .update({ status: 'Under Maintenance' })
                .eq('id', log.asset);
        } else if (status === 'Completed') {
            // Count active logs excluding this one
            const { data: activeLogs, error: countErr } = await supabase
                .from('maintenance_logs')
                .select('id')
                .eq('asset', log.asset)
                .in('status', ['Pending', 'In Progress'])
                .neq('id', log.id);

            if (!countErr && (!activeLogs || activeLogs.length === 0)) {
                await supabase
                    .from('assets')
                    .update({ status: 'Active' })
                    .eq('id', log.asset);
            }
        }

        res.json({ ...updatedLog, _id: updatedLog.id });
    } catch (e: any) {
        res.status(400).json({ error: e.message || 'Server Error' });
    }
});

export default router;
