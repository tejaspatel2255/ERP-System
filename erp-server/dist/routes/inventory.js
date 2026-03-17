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
const StoreLedger_1 = __importDefault(require("../models/StoreLedger"));
const Alert_1 = __importDefault(require("../models/Alert"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Middleware (Reused, should be extracted ideally)
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
// GET /api/inventory/ledger
router.get('/ledger', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ledger = yield StoreLedger_1.default.find()
            .populate('product', 'name sku')
            .sort({ date: -1 })
            .limit(100); // Limit correctly for now
        res.json(ledger);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// GET /api/inventory/alerts
router.get('/alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alerts = yield Alert_1.default.find({ isRead: false })
            .sort({ createdAt: -1 });
        res.json(alerts);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST /api/inventory/alerts/:id/read
router.post('/alerts/:id/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Alert_1.default.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
