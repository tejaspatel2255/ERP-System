import express, { Request, Response } from 'express';
import Dispatch from '../models/Dispatch';
import Sale from '../models/Sale';

const router = express.Router();

// Get all dispatches
router.get('/', async (req: Request, res: Response) => {
    try {
        const dispatches = await Dispatch.find().populate('order').sort({ createdAt: -1 });
        res.status(200).json(dispatches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dispatches' });
    }
});

// Create a new dispatch
router.post('/', async (req: Request, res: Response) => {
    try {
        const { orderId, carrier, driverName, vehicleNumber, dispatchDate, manifestNumber } = req.body;

        // Verify order exists and is eligible (e.g., Completed)
        const order = await Sale.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        // Optional: Check if order.status === 'Completed'

        const newDispatch = new Dispatch({
            order: orderId,
            manifestNumber: manifestNumber || `MN-${Date.now()}`,
            carrier,
            driverName,
            vehicleNumber,
            dispatchDate: new Date(dispatchDate)
        });

        await newDispatch.save();
        res.status(201).json(newDispatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create dispatch' });
    }
});

// Update status and/or POD
router.put('/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, proofOfDelivery } = req.body;
        const updateData: any = {};
        if (status) updateData.status = status;
        if (proofOfDelivery) updateData.proofOfDelivery = proofOfDelivery;

        const updatedDispatch = await Dispatch.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedDispatch) return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json(updatedDispatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update dispatch status' });
    }
});

// Get Dispatch Details (for Challan)
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const dispatch = await Dispatch.findById(req.params.id)
            .populate({
                path: 'order',
                populate: { path: 'customer' } // Deep populate customer
            });

        if (!dispatch) return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json(dispatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dispatch details' });
    }
});

export default router;
