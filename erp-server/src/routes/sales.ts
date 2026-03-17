import express from 'express';
import jwt from 'jsonwebtoken';
import Sale from '../models/Sale';
import Product from '../models/Product';
import Customer from '../models/Customer';
import StoreLedger from '../models/StoreLedger';
import Alert from '../models/Alert';

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

// GET All Sales
router.get('/', async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('customer', 'name email')
            .sort({ date: -1 });
        res.json(sales);
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST Create Sale (Order)
router.post('/', async (req, res) => {
    try {
        const { customerId, items, status } = req.body;

        // 1. Fetch Customer
        const customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        let totalAmount = 0;
        const saleItems = [];
        const productsToUpdate = [];

        // 2. Validate Products & Calculate Total
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            saleItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price,
                total: itemTotal
            });

            productsToUpdate.push({ product, quantity: item.quantity });
        }

        // 3. Create Sale Record
        const newSale = await Sale.create({
            customer: customer._id,
            customerName: customer.name,
            items: saleItems,
            totalAmount,
            status: status || 'Completed',
            date: new Date()
        });

        // 4. Update Stock & Create Ledger (Only if Completed)
        if (status === 'Completed' || !status) { // Default is Completed
            for (const { product, quantity } of productsToUpdate) {
                // Deduct Stock
                product.stock -= quantity;
                await product.save();

                // Create Ledger Entry
                await StoreLedger.create({
                    product: product._id,
                    type: 'OUT',
                    quantity: quantity,
                    referenceId: newSale._id,
                    referenceType: 'Sale',
                    remarks: `Sold to ${customer.name}`
                });

                // Check Low Stock
                if (product.stock <= product.minLevel) {
                    const alertMsg = `Low Stock Warning: ${product.name} is down to ${product.stock} ${product.unit}`;

                    const existingAlert = await Alert.findOne({
                        type: 'LOW_STOCK',
                        message: { $regex: product.name },
                        isRead: false
                    });

                    if (!existingAlert) {
                        const newAlert = await Alert.create({
                            message: alertMsg,
                            type: 'LOW_STOCK'
                        });
                        // Real-time Notification
                        (req as any).io.emit('notification', newAlert);
                    }
                }
            }
        }

        // Real-time New Order Event
        (req as any).io.emit('new_order', {
            message: `New Order #${newSale._id.toString().slice(-6)} from ${customer.name}`,
            sale: newSale
        });

        res.status(201).json(newSale);

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Server Error' });
    }
});

export default router;
