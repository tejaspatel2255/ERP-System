import express from 'express';
import jwt from 'jsonwebtoken';
import Purchase from '../models/Purchase';
import Product from '../models/Product';
import StoreLedger from '../models/StoreLedger';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify token
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

// GET All Purchases
router.get('/', async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({ date: -1 });
        res.json(purchases);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Purchase
router.post('/', async (req, res) => {
    try {
        const { vendorName, items } = req.body;

        let totalAmount = 0;
        const purchaseItems = [];
        const productsToUpdate = [];

        // 1. Validate Products & Calculate Total
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });

            const itemTotal = item.cost * item.quantity;
            totalAmount += itemTotal;

            purchaseItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                cost: item.cost,
                total: itemTotal
            });

            productsToUpdate.push({ product, quantity: item.quantity, cost: item.cost });
        }

        // 2. Create Purchase Record
        const newPurchase = await Purchase.create({
            vendorName,
            items: purchaseItems,
            totalAmount,
            date: new Date()
        });

        // 3. Update Stock & Create Ledger
        for (const { product, quantity, cost } of productsToUpdate) {
            // Increment Stock
            product.stock += quantity;
            // Optionally update cost price if needed (Weighted Average Cost could be implemented here)
            // For now, we just update stock
            await product.save();

            // Create Ledger Entry
            await StoreLedger.create({
                product: product._id,
                type: 'IN',
                quantity: quantity,
                referenceId: newPurchase._id,
                referenceType: 'Purchase',
                remarks: `Purchased from ${vendorName} @ ${cost}`
            });
        }

        res.status(201).json(newPurchase);

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
