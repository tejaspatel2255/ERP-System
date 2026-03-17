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
const Product_1 = __importDefault(require("../models/Product"));
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
// GET All Products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find().sort({ createdAt: -1 });
        res.json(products);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// GET Single Product
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findById(req.params.id);
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST Create Product
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, sku, category, price, stock, minLevel, unit } = req.body;
        const existing = yield Product_1.default.findOne({ sku });
        if (existing)
            return res.status(400).json({ error: 'Product with this SKU already exists' });
        const newProduct = yield Product_1.default.create({
            name, sku, category, price, stock, minLevel, unit
        });
        res.status(201).json(newProduct);
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
}));
// PUT Update Product
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield Product_1.default.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updated)
            return res.status(404).json({ error: 'Product not found' });
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
}));
// DELETE Product
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Future: Check if product is used in Sales/Purchases before deleting!
        const deleted = yield Product_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
