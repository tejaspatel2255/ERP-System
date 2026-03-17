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
const Asset_1 = __importDefault(require("../models/Asset"));
const MaintenanceLog_1 = __importDefault(require("../models/MaintenanceLog"));
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
// ================= ASSETS =================
// GET /api/maintenance/assets
router.get('/assets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield Asset_1.default.find().sort({ createdAt: -1 });
        res.json(assets);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST /api/maintenance/assets
router.post('/assets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const asset = new Asset_1.default(req.body);
        yield asset.save();
        res.status(201).json(asset);
    }
    catch (e) {
        res.status(400).json({ error: 'Failed to create asset' });
    }
}));
// ================= LOGS =================
// GET /api/maintenance/logs
router.get('/logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield MaintenanceLog_1.default.find()
            .populate('asset', 'name serialNumber')
            .sort({ scheduledDate: 1 });
        res.json(logs);
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// POST /api/maintenance/logs
router.post('/logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const log = new MaintenanceLog_1.default(req.body);
        yield log.save();
        // If it's an immediate issue, update asset status
        if (log.status === 'In Progress' || log.type === 'Issue') {
            yield Asset_1.default.findByIdAndUpdate(log.asset, { status: 'Under Maintenance' });
        }
        res.status(201).json(log);
    }
    catch (e) {
        res.status(400).json({ error: 'Failed to create log' });
    }
}));
// PUT /api/maintenance/logs/:id/status
router.put('/logs/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { status, cost, completionDate } = req.body;
        const log = yield MaintenanceLog_1.default.findById(req.params.id).session(session);
        if (!log)
            throw new Error('Log not found');
        log.status = status;
        if (cost)
            log.cost = cost;
        if (completionDate)
            log.completionDate = completionDate;
        if (status === 'In Progress') {
            yield Asset_1.default.findByIdAndUpdate(log.asset, { status: 'Under Maintenance' }, { session });
        }
        else if (status === 'Completed') {
            // Check if there are other active logs for this asset
            const activeLogs = yield MaintenanceLog_1.default.countDocuments({
                asset: log.asset,
                status: { $in: ['Pending', 'In Progress'] },
                _id: { $ne: log._id }
            }).session(session);
            if (activeLogs === 0) {
                yield Asset_1.default.findByIdAndUpdate(log.asset, { status: 'Active' }, { session });
            }
        }
        yield log.save({ session });
        yield session.commitTransaction();
        res.json(log);
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
