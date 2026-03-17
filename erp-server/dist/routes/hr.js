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
const Employee_1 = __importDefault(require("../models/Employee"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Leave_1 = __importDefault(require("../models/Leave"));
const router = express_1.default.Router();
// --- Employee Routes ---
// Get all employees
router.get('/employees', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employees = yield Employee_1.default.find().sort({ createdAt: -1 });
        res.json(employees);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching employees', error: err });
    }
}));
// Create new employee
router.post('/employees', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newEmployee = new Employee_1.default(req.body);
        const savedEmployee = yield newEmployee.save();
        res.status(201).json(savedEmployee);
    }
    catch (err) {
        res.status(500).json({ message: 'Error creating employee', error: err });
    }
}));
// Update employee
router.put('/employees/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedEmployee = yield Employee_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedEmployee);
    }
    catch (err) {
        res.status(500).json({ message: 'Error updating employee', error: err });
    }
}));
// --- Attendance Routes ---
// Get attendance for a specific date (or today)
router.get('/attendance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
        const attendance = yield Attendance_1.default.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        }).populate('employee', 'firstName lastName');
        res.json(attendance);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching attendance', error: err });
    }
}));
// Mark Check-in
router.post('/attendance/checkin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        // Check if already checked in
        let attendance = yield Attendance_1.default.findOne({
            employee: employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        if (attendance) {
            return res.status(400).json({ message: 'Already checked in for today' });
        }
        attendance = new Attendance_1.default({
            employee: employeeId,
            date: new Date(),
            checkIn: new Date(),
            status: 'Present'
        });
        yield attendance.save();
        res.status(201).json(attendance);
    }
    catch (err) {
        res.status(500).json({ message: 'Error marking check-in', error: err });
    }
}));
// Mark Check-out
router.post('/attendance/checkout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        const attendance = yield Attendance_1.default.findOne({
            employee: employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        if (!attendance) {
            return res.status(404).json({ message: 'No check-in record found for today' });
        }
        attendance.checkOut = new Date();
        yield attendance.save();
        res.json(attendance);
    }
    catch (err) {
        res.status(500).json({ message: 'Error marking check-out', error: err });
    }
}));
// --- Leave Routes ---
// Get all leave requests
router.get('/leaves', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const leaves = yield Leave_1.default.find().populate('employee', 'firstName lastName').sort({ createdAt: -1 });
        res.json(leaves);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching leaves', error: err });
    }
}));
// Apply for leave
router.post('/leaves', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newLeave = new Leave_1.default(req.body);
        const savedLeave = yield newLeave.save();
        res.status(201).json(savedLeave);
    }
    catch (err) {
        res.status(500).json({ message: 'Error applying for leave', error: err });
    }
}));
// Update leave status (Approve/Reject)
router.put('/leaves/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const updatedLeave = yield Leave_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(updatedLeave);
    }
    catch (err) {
        res.status(500).json({ message: 'Error updating leave status', error: err });
    }
}));
exports.default = router;
