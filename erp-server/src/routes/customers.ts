import express from 'express';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer';

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

// GET All Customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Customer
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address, gstin } = req.body;

        const existing = await Customer.findOne({ $or: [{ email }, { phone }] });
        if (existing) return res.status(400).json({ error: 'Customer with this email or phone already exists' });

        const newCustomer = await Customer.create({ name, email, phone, address, gstin });
        res.status(201).json(newCustomer);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// PUT Update Customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Customer.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Customer not found' });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

// DELETE Customer (Check for constraints later)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // In real app, check for linked Invoices first!
        const deleted = await Customer.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

export default router;
