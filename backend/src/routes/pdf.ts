import express from 'express';
import { verifyToken } from '../middlewares/auth';
import { PDFGenerator } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.use(verifyToken);

// GET /api/pdf/sales/:id
router.get('/sales/:id', async (req: any, res: any) => {
    try {
        const { data: sale, error } = await supabase
            .from('sales')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !sale) {
            return res.status(404).json({ error: 'Sale record not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${sale.id.slice(-6)}.pdf`);

        PDFGenerator.generateInvoice(
            res,
            'Sales Invoice',
            sale.id,
            sale.date,
            sale.customerName || 'Valued Customer',
            sale.items,
            sale.totalAmount
        );
    } catch (err: any) {
        console.error('Error generating sales PDF:', err);
        res.status(500).json({ error: 'Internal server error generating PDF' });
    }
});

// GET /api/pdf/purchase/:id
router.get('/purchase/:id', async (req: any, res: any) => {
    try {
        const { data: purchase, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !purchase) {
            return res.status(404).json({ error: 'Purchase record not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=po-${purchase.id.slice(-6)}.pdf`);

        PDFGenerator.generateInvoice(
            res,
            'Purchase Order',
            purchase.id,
            purchase.date,
            purchase.vendorName || 'Valued Vendor',
            purchase.items,
            purchase.totalAmount
        );
    } catch (err: any) {
        console.error('Error generating purchase PDF:', err);
        res.status(500).json({ error: 'Internal server error generating PDF' });
    }
});

// GET /api/pdf/dispatch/:id
router.get('/dispatch/:id', async (req: any, res: any) => {
    try {
        const { data: dispatch, error } = await supabase
            .from('dispatches')
            .select(`
                *,
                order:order (*)
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !dispatch) {
            return res.status(404).json({ error: 'Dispatch record not found' });
        }

        const sale = dispatch.order as any;
        if (!sale) {
            return res.status(400).json({ error: 'No order associated with this dispatch' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=challan-${dispatch.manifestNumber}.pdf`);

        const details = [
            { name: `Carrier: ${dispatch.carrier}` },
            { name: `Driver Name: ${dispatch.driverName}` },
            { name: `Vehicle Number: ${dispatch.vehicleNumber}` },
            ...sale.items.map((i: any) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                total: i.total,
            })),
        ];

        PDFGenerator.generateInvoice(
            res,
            'Delivery Challan',
            dispatch.id,
            dispatch.dispatchDate,
            sale.customerName || 'Valued Customer',
            details,
            sale.totalAmount
        );
    } catch (err: any) {
        console.error('Error generating dispatch PDF:', err);
        res.status(500).json({ error: 'Internal server error generating PDF' });
    }
});

export default router;
