import express from 'express';
import jwt from 'jsonwebtoken';
import BOM from '../models/BOM';
import WorkOrder from '../models/WorkOrder';
import Product from '../models/Product';
import StoreLedger from '../models/StoreLedger';
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

// ================= B O M =================

// GET /api/production/bom
router.get('/bom', async (req, res) => {
    try {
        const boms = await BOM.find()
            .populate('product', 'name sku')
            .populate('materials.material', 'name sku unit unitCost');
        res.json(boms);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/production/bom
router.post('/bom', async (req, res) => {
    try {
        const { name, product, materials, notes } = req.body;
        const bom = new BOM({ name, product, materials, notes });
        await bom.save();
        res.status(201).json(bom);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create BOM' });
    }
});

// ================= Work Orders =================

// GET /api/production/work-orders
router.get('/work-orders', async (req, res) => {
    try {
        const orders = await WorkOrder.find()
            .populate('product', 'name sku')
            .populate('bom', 'name')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/production/work-orders
router.post('/work-orders', async (req, res) => {
    try {
        const { orderNumber, product, bom, quantity, startDate, endDate } = req.body;
        const workOrder = new WorkOrder({
            orderNumber, product, bom, quantity, startDate, endDate,
            status: 'Pending'
        });
        await workOrder.save();
        res.status(201).json(workOrder);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create Work Order' });
    }
});

// PUT /api/production/work-orders/:id/status
router.put('/work-orders/:id/status', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status } = req.body;
        const workOrder = await WorkOrder.findById(req.params.id)
            .populate('bom')
            .session(session);

        if (!workOrder) throw new Error('Work Order not found');

        // Logic for COMPLETION
        if (status === 'Completed' && workOrder.status !== 'Completed') {
            const bom = await BOM.findById(workOrder.bom).session(session);
            if (!bom) throw new Error('BOM not found');

            // 1. Deduct Raw Materials
            for (const item of bom.materials) {
                const totalNeeded = item.quantity * workOrder.quantity;

                const material = await Product.findById(item.material).session(session);
                if (!material) throw new Error(`Material not found`);

                if (material.stock < totalNeeded) {
                    throw new Error(`Insufficient stock for material: ${material.name}`);
                }

                material.stock -= totalNeeded;
                await material.save({ session });

                // Create Ledger Entry (OUT)
                await new StoreLedger({
                    product: material._id,
                    type: 'OUT',
                    quantity: totalNeeded,
                    referenceId: workOrder.id,
                    referenceType: 'Adjustment', // Using Adjustment as close equivalent
                    date: new Date().toISOString(),
                    remarks: `Production Order #${workOrder.orderNumber}`
                }).save({ session });
            }

            // 2. Add Finished Good
            const finishedGood = await Product.findById(workOrder.product).session(session);
            if (finishedGood) {
                finishedGood.stock += workOrder.quantity;
                await finishedGood.save({ session });

                // Create Ledger Entry (IN)
                await new StoreLedger({
                    product: finishedGood._id,
                    type: 'IN',
                    quantity: workOrder.quantity,
                    referenceId: workOrder.id,
                    referenceType: 'Adjustment',
                    date: new Date().toISOString(),
                    remarks: `Production Order #${workOrder.orderNumber} Completed`
                }).save({ session });
            }
        }

        workOrder.status = status;
        await workOrder.save({ session });

        await session.commitTransaction();
        res.json(workOrder);

    } catch (e: any) {
        await session.abortTransaction();
        res.status(400).json({ error: e.message || 'Server Error' });
    } finally {
        session.endSession();
    }
});

export default router;
