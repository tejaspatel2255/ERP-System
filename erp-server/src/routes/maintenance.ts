import express from 'express';
import jwt from 'jsonwebtoken';
import Asset from '../models/Asset';
import MaintenanceLog from '../models/MaintenanceLog';
import mongoose from 'mongoose';

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

// ================= ASSETS =================

// GET /api/maintenance/assets
router.get('/assets', async (req, res) => {
    try {
        const assets = await Asset.find().sort({ createdAt: -1 });
        res.json(assets);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/maintenance/assets
router.post('/assets', async (req, res) => {
    try {
        const asset = new Asset(req.body);
        await asset.save();
        res.status(201).json(asset);
    } catch (e) {
        res.status(400).json({ error: 'Failed to create asset' });
    }
});

// ================= LOGS =================

// GET /api/maintenance/logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await MaintenanceLog.find()
            .populate('asset', 'name serialNumber')
            .sort({ scheduledDate: 1 });
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/maintenance/logs
router.post('/logs', async (req, res) => {
    try {
        const log = new MaintenanceLog(req.body);
        await log.save();

        // If it's an immediate issue, update asset status
        if (log.status === 'In Progress' || log.type === 'Issue') {
            await Asset.findByIdAndUpdate(log.asset, { status: 'Under Maintenance' });
        }

        res.status(201).json(log);
    } catch (e) {
        res.status(400).json({ error: 'Failed to create log' });
    }
});

// PUT /api/maintenance/logs/:id/status
router.put('/logs/:id/status', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status, cost, completionDate } = req.body;
        const log = await MaintenanceLog.findById(req.params.id).session(session);
        if (!log) throw new Error('Log not found');

        log.status = status;
        if (cost) log.cost = cost;
        if (completionDate) log.completionDate = completionDate;

        if (status === 'In Progress') {
            await Asset.findByIdAndUpdate(log.asset, { status: 'Under Maintenance' }, { session });
        } else if (status === 'Completed') {
            // Check if there are other active logs for this asset
            const activeLogs = await MaintenanceLog.countDocuments({
                asset: log.asset,
                status: { $in: ['Pending', 'In Progress'] },
                _id: { $ne: log._id }
            }).session(session);

            if (activeLogs === 0) {
                await Asset.findByIdAndUpdate(log.asset, { status: 'Active' }, { session });
            }
        }

        await log.save({ session });
        await session.commitTransaction();
        res.json(log);
    } catch (e: any) {
        await session.abortTransaction();
        res.status(400).json({ error: e.message || 'Server Error' });
    } finally {
        session.endSession();
    }
});

export default router;
