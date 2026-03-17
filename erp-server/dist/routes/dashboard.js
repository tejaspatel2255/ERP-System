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
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Middleware to verify token
const verifyToken = (req, res, next) => {
    var _a;
    const token = req.cookies.token || ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded; // Add user to request
        next();
    }
    catch (e) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
const Product_1 = __importDefault(require("../models/Product"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Purchase_1 = __importDefault(require("../models/Purchase"));
router.get('/stats', verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // 1. Sales Data (Last 7 Days)
        const salesData = yield Sale_1.default.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // 2. Purchase Data (Last 7 Days)
        const purchaseData = yield Purchase_1.default.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // 3. Low Stock Alerts
        const lowStockItems = yield Product_1.default.find({
            $expr: { $lte: ["$stock", "$minLevel"] }
        }).select('name stock minLevel');
        // 4. Totals
        const totalSales = yield Sale_1.default.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
        const totalPurchases = yield Purchase_1.default.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
        // Format for Frontend
        res.json({
            sales: salesData.map(s => ({ date: s._id, amount: s.amount })),
            purchases: purchaseData.map(p => ({ date: p._id, amount: p.amount })),
            alerts: lowStockItems.map(p => ({
                id: p._id,
                item: p.name,
                currentStock: p.stock,
                minLevel: p.minLevel
            })),
            alertCount: lowStockItems.length,
            totals: {
                sales: ((_a = totalSales[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                purchases: ((_b = totalPurchases[0]) === null || _b === void 0 ? void 0 : _b.total) || 0,
            }
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
