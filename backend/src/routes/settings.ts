import express from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken, authorize } from '../middlewares/auth';

const router = express.Router();

router.use(verifyToken);

// Get all settings
router.get('/', async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        const settingsMap: Record<string, any> = {};
        settings.forEach((s: any) => {
            settingsMap[s.key] = s.value;
        });
        res.json(settingsMap);
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching settings', error: err.message });
    }
});

// Update multiple settings (Bulk)
router.put('/', authorize(['admin']), async (req, res) => {
    try {
        const updates = req.body;
        const keys = Object.keys(updates);

        for (const key of keys) {
            const { data: existing } = await supabase
                .from('settings')
                .select('*')
                .eq('key', key)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('settings')
                    .update({ value: updates[key] })
                    .eq('key', key);
            } else {
                await supabase
                    .from('settings')
                    .insert([{ key, value: updates[key] }]);
            }
        }

        const { data: settings, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        const settingsMap: Record<string, any> = {};
        settings.forEach((s: any) => {
            settingsMap[s.key] = s.value;
        });

        res.json(settingsMap);
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating settings', error: err.message });
    }
});

// Initialize default settings if empty
router.post('/init', authorize(['admin']), async (req, res) => {
    try {
        const defaults = [
            { key: 'orgName', value: 'Nexus ERP', category: 'General' },
            { key: 'currency', value: 'USD', category: 'General' },
            { key: 'dateFormat', value: 'YYYY-MM-DD', category: 'General' },
            { key: 'passwordPolicy', value: { minLength: 8, requireSpecial: true }, category: 'Security' },
            { key: 'notifications', value: { email: true, inApp: true }, category: 'Notifications' },
        ];

        for (const d of defaults) {
            const { data: existing } = await supabase
                .from('settings')
                .select('*')
                .eq('key', d.key)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('settings')
                    .update({ value: d.value, category: d.category })
                    .eq('key', d.key);
            } else {
                await supabase
                    .from('settings')
                    .insert([d]);
            }
        }
        res.json({ message: 'Defaults initialized' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error initializing defaults', error: err.message });
    }
});

export default router;
