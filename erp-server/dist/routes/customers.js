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
const Customer_1 = __importDefault(require("../models/Customer"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Middleware (Reused)
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
// GET All Customers
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield Customer_1.default.find().sort({ createdAt: -1 });
        res.json(customers);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST Create Customer
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, address, gstin } = req.body;
        const existing = yield Customer_1.default.findOne({ $or: [{ email }, { phone }] });
        if (existing)
            return res.status(400).json({ error: 'Customer with this email or phone already exists' });
        const newCustomer = yield Customer_1.default.create({ name, email, phone, address, gstin });
        res.status(201).json(newCustomer);
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
}));
// PUT Update Customer
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield Customer_1.default.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updated)
            return res.status(404).json({ error: 'Customer not found' });
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'Server Error' });
    }
}));
// DELETE Customer (Check for constraints later)
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // In real app, check for linked Invoices first!
        const deleted = yield Customer_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
