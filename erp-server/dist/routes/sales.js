"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Product_1 = __importDefault(require("../models/Product"));
const Customer_1 = __importDefault(require("../models/Customer"));
const StoreLedger_1 = __importDefault(require("../models/StoreLedger"));
const Alert_1 = __importDefault(require("../models/Alert"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Middleware to verify token (Reused)
const verifyToken = (req, res, next) => {
    var _a;
    const token = req.cookies.token || ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (e) {
        return res.status(401).json({ error: 'Invalid Token' });
    }
};
router.use(verifyToken);
// GET All Sales
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sales = yield Sale_1.default.find()
            .populate('customer', 'name email')
            .sort({ date: -1 });
        res.json(sales);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST Create Sale (Order)
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, items, status } = req.body;
        // 1. Fetch Customer
        const customer = yield Customer_1.default.findById(customerId);
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        let totalAmount = 0;
        const saleItems = [];
        const productsToUpdate = [];
        // 2. Validate Products & Calculate Total
        for (const item of items) {
            const product = yield Product_1.default.findById(item.productId);
            if (!product)
                return res.status(404).json({ error: `Product not found: ${item.productId}` });
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
        const newSale = yield Sale_1.default.create({
            customer: customer._id,
            customerName: customer.name,
            items: saleItems,
            totalAmount,
            status: status || 'Completed',
            date: new Date()
        });
        // 4. Update Stock & Create Ledger (Only if Completed)
        if (status === 'Completed') {
            for (const { product, quantity } of productsToUpdate) {
                // Deduct Stock
                product.stock -= quantity;
                yield product.save();
                // Create Ledger Entry
                yield StoreLedger_1.default.create({
                    product: product._id,
                    type: 'OUT',
                    quantity: quantity,
                    referenceId: newSale._id,
                    referenceType: 'Sale',
                    remarks: `Sold to ${customer.name}`
                });
                // Check Low Stock
                if (product.stock <= product.minLevel) {
                    const existingAlert = yield Alert_1.default.findOne({
                        type: 'LOW_STOCK',
                        message: { $regex: product.name },
                        isRead: false
                    });
                    if (!existingAlert) {
                        yield Alert_1.default.create({
                            message: `Low Stock Warning: ${product.name} is down to ${product.stock} ${product.unit}`,
                            type: 'LOW_STOCK'
                        });
                    }
                }
            }
        }
        res.status(201).json(newSale);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Server Error' });
    }
}));
exports.default = router;
