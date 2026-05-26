import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.use(verifyToken);

// GET All Customers
router.get('/', async (req, res) => {
    try {
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map id to _id so frontend doesn't break
        res.json(customers.map((c: any) => ({ ...c, _id: c.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// POST Create Customer
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address, gstin } = req.body;

        // Check duplicate
        const { data: existing } = await supabase
            .from('customers')
            .select('*')
            .or(`email.eq.${email},phone.eq.${phone}`)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Customer with this email or phone already exists' });
        }

        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert([{ name, email, phone, address, gstin }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...newCustomer, _id: newCustomer.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// PUT Update Customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: updated, error } = await supabase
            .from('customers')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error || !updated) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ ...updated, _id: updated.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// DELETE Customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: deleted, error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !deleted) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
