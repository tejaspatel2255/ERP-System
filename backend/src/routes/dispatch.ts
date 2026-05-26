import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Get all dispatches
router.get('/', async (req: Request, res: Response) => {
    try {
        const { data: dispatches, error } = await supabase
            .from('dispatches')
            .select(`
                *,
                order:order (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(dispatches.map((d: any) => ({ ...d, _id: d.id })));
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch dispatches' });
    }
});

// Create a new dispatch
router.post('/', async (req: Request, res: Response) => {
    try {
        const { orderId, carrier, driverName, vehicleNumber, dispatchDate, manifestNumber } = req.body;

        const { data: order, error: orderErr } = await supabase
            .from('sales')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });

        const { data: newDispatch, error } = await supabase
            .from('dispatches')
            .insert([{
                order: orderId,
                manifestNumber: manifestNumber || `MN-${Date.now()}`,
                carrier,
                driverName,
                vehicleNumber,
                dispatchDate: new Date(dispatchDate).toISOString(),
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...newDispatch, _id: newDispatch.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to create dispatch' });
    }
});

// Update status and/or POD
router.put('/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, proofOfDelivery } = req.body;
        const updateData: any = {};
        if (status) updateData.status = status;
        if (proofOfDelivery) updateData.proofOfDelivery = proofOfDelivery;

        const { data: updatedDispatch, error } = await supabase
            .from('dispatches')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error || !updatedDispatch) return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json({ ...updatedDispatch, _id: updatedDispatch.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update dispatch status' });
    }
});

// Get Dispatch Details (for Challan)
router.get('/:id', async (req: Request, res: Response) => {
    try {
        // Deep populate is done by nesting queries in select
        const { data: dispatch, error } = await supabase
            .from('dispatches')
            .select(`
                *,
                order:order (
                    *,
                    customer:customer (*)
                )
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !dispatch) return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json({ ...dispatch, _id: dispatch.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch dispatch details' });
    }
});

export default router;
