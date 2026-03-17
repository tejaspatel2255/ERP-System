import express from 'express';
import Setting from '../models/Setting';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find();
        // Transform array to object for easier frontend consumption: { org_name: 'My Corp', ... }
        const settingsMap: Record<string, any> = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });
        res.json(settingsMap);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching settings', error: err });
    }
});

// Update multiple settings (Bulk)
router.put('/', async (req, res) => {
    try {
        const updates = req.body; // Expect key-value object { org_name: "New Name", ... }
        const keys = Object.keys(updates);

        for (const key of keys) {
            await Setting.findOneAndUpdate(
                { key },
                {
                    value: updates[key],
                    // Default logic to assign category if creating new
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        // Return updated list
        const settings = await Setting.find();
        const settingsMap: Record<string, any> = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        res.json(settingsMap);
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings', error: err });
    }
});

// Initialize default settings if empty (Helper route or auto-run)
router.post('/init', async (req, res) => {
    try {
        const defaults = [
            { key: 'orgName', value: 'Nexus ERP', category: 'General' },
            { key: 'currency', value: 'USD', category: 'General' },
            { key: 'dateFormat', value: 'YYYY-MM-DD', category: 'General' },
            { key: 'passwordPolicy', value: { minLength: 8, requireSpecial: true }, category: 'Security' },
            { key: 'notifications', value: { email: true, inApp: true }, category: 'Notifications' }
        ];

        for (const d of defaults) {
            await Setting.findOneAndUpdate({ key: d.key }, d, { upsert: true });
        }
        res.json({ message: 'Defaults initialized' });
    } catch (err) {
        res.status(500).json({ message: 'Error initializing defaults', error: err });
    }
});

export default router;
