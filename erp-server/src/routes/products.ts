import express from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify token (Reused)
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

// GET All Products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET Single Product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Product
router.post('/', async (req, res) => {
    try {
        const { name, sku, category, price, stock, minLevel, unit } = req.body;

        const existing = await Product.findOne({ sku });
        if (existing) return res.status(400).json({ error: 'Product with this SKU already exists' });

        const newProduct = await Product.create({
            name, sku, category, price, stock, minLevel, unit
        });
        res.status(201).json(newProduct);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// PUT Update Product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// DELETE Product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Future: Check if product is used in Sales/Purchases before deleting!
        const deleted = await Product.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;
