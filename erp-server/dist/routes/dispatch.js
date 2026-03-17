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
const Dispatch_1 = __importDefault(require("../models/Dispatch"));
const Sale_1 = __importDefault(require("../models/Sale"));
const router = express_1.default.Router();
// Get all dispatches
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dispatches = yield Dispatch_1.default.find().populate('order').sort({ createdAt: -1 });
        res.status(200).json(dispatches);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dispatches' });
    }
}));
// Create a new dispatch
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, carrier, driverName, vehicleNumber, dispatchDate, manifestNumber } = req.body;
        // Verify order exists and is eligible (e.g., Completed)
        const order = yield Sale_1.default.findById(orderId);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Optional: Check if order.status === 'Completed'
        const newDispatch = new Dispatch_1.default({
            order: orderId,
            manifestNumber: manifestNumber || `MN-${Date.now()}`,
            carrier,
            driverName,
            vehicleNumber,
            dispatchDate: new Date(dispatchDate)
        });
        yield newDispatch.save();
        res.status(201).json(newDispatch);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create dispatch' });
    }
}));
// Update status and/or POD
router.put('/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, proofOfDelivery } = req.body;
        const updateData = {};
        if (status)
            updateData.status = status;
        if (proofOfDelivery)
            updateData.proofOfDelivery = proofOfDelivery;
        const updatedDispatch = yield Dispatch_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedDispatch)
            return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json(updatedDispatch);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update dispatch status' });
    }
}));
// Get Dispatch Details (for Challan)
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dispatch = yield Dispatch_1.default.findById(req.params.id)
            .populate({
            path: 'order',
            populate: { path: 'customer' } // Deep populate customer
        });
        if (!dispatch)
            return res.status(404).json({ error: 'Dispatch not found' });
        res.status(200).json(dispatch);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dispatch details' });
    }
}));
exports.default = router;
