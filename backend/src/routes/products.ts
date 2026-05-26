import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.use(verifyToken);

// GET All Products
router.get('/', async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(products.map((p: any) => ({ ...p, _id: p.id })));
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// GET Single Product
router.get('/:id', async (req, res) => {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ ...product, _id: product.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// POST Create Product
router.post('/', async (req, res) => {
    try {
        const { name, sku, category, price, stock, minLevel, unit } = req.body;

        // Check duplicate
        const { data: existing } = await supabase
            .from('products')
            .select('*')
            .eq('sku', sku)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Product with this SKU already exists' });
        }

        const { data: newProduct, error } = await supabase
            .from('products')
            .insert([{ name, sku, category, price, stock, minLevel, unit }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...newProduct, _id: newProduct.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// PUT Update Product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: updated, error } = await supabase
            .from('products')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error || !updated) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ ...updated, _id: updated.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// DELETE Product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: deleted, error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
