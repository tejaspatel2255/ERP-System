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
const BOM_1 = __importDefault(require("../models/BOM"));
const WorkOrder_1 = __importDefault(require("../models/WorkOrder"));
const Product_1 = __importDefault(require("../models/Product"));
const StoreLedger_1 = __importDefault(require("../models/StoreLedger"));
const mongoose_1 = __importDefault(require("mongoose"));
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
// ================= B O M =================
// GET /api/production/bom
router.get('/bom', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const boms = yield BOM_1.default.find()
            .populate('product', 'name sku')
            .populate('materials.material', 'name sku unit unitCost');
        res.json(boms);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST /api/production/bom
router.post('/bom', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, product, materials, notes } = req.body;
        const bom = new BOM_1.default({ name, product, materials, notes });
        yield bom.save();
        res.status(201).json(bom);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to create BOM' });
    }
}));
// ================= Work Orders =================
// GET /api/production/work-orders
router.get('/work-orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield WorkOrder_1.default.find()
            .populate('product', 'name sku')
            .populate('bom', 'name')
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST /api/production/work-orders
router.post('/work-orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderNumber, product, bom, quantity, startDate, endDate } = req.body;
        const workOrder = new WorkOrder_1.default({
            orderNumber, product, bom, quantity, startDate, endDate,
            status: 'Pending'
        });
        yield workOrder.save();
        res.status(201).json(workOrder);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to create Work Order' });
    }
}));
// PUT /api/production/work-orders/:id/status
router.put('/work-orders/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { status } = req.body;
        const workOrder = yield WorkOrder_1.default.findById(req.params.id)
            .populate('bom')
            .session(session);
        if (!workOrder)
            throw new Error('Work Order not found');
        // Logic for COMPLETION
        if (status === 'Completed' && workOrder.status !== 'Completed') {
            const bom = yield BOM_1.default.findById(workOrder.bom).session(session);
            if (!bom)
                throw new Error('BOM not found');
            // 1. Deduct Raw Materials
            for (const item of bom.materials) {
                const totalNeeded = item.quantity * workOrder.quantity;
                const material = yield Product_1.default.findById(item.material).session(session);
                if (!material)
                    throw new Error(`Material not found`);
                if (material.stock < totalNeeded) {
                    throw new Error(`Insufficient stock for material: ${material.name}`);
                }
                material.stock -= totalNeeded;
                yield material.save({ session });
                // Create Ledger Entry (OUT)
                yield new StoreLedger_1.default({
                    product: material._id,
                    type: 'OUT',
                    quantity: totalNeeded,
                    referenceId: workOrder.id,
                    referenceType: 'Adjustment', // Using Adjustment as close equivalent
                    date: new Date().toISOString(),
                    remarks: `Production Order #${workOrder.orderNumber}`
                }).save({ session });
            }
            // 2. Add Finished Good
            const finishedGood = yield Product_1.default.findById(workOrder.product).session(session);
            if (finishedGood) {
                finishedGood.stock += workOrder.quantity;
                yield finishedGood.save({ session });
                // Create Ledger Entry (IN)
                yield new StoreLedger_1.default({
                    product: finishedGood._id,
                    type: 'IN',
                    quantity: workOrder.quantity,
                    referenceId: workOrder.id,
                    referenceType: 'Adjustment',
                    date: new Date().toISOString(),
                    remarks: `Production Order #${workOrder.orderNumber} Completed`
                }).save({ session });
            }
        }
        workOrder.status = status;
        yield workOrder.save({ session });
        yield session.commitTransaction();
        res.json(workOrder);
    }
    catch (e) {
        yield session.abortTransaction();
        res.status(400).json({ error: e.message || 'Server Error' });
    }
    finally {
        session.endSession();
    }
}));
exports.default = router;
