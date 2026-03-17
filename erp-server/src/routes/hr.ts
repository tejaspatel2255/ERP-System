import express from 'express';
import Employee from '../models/Employee';
import Attendance from '../models/Attendance';
import Leave from '../models/Leave';

const router = express.Router();

// --- Employee Routes ---

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching employees', error: err });
    }
});

// Create new employee
router.post('/employees', async (req, res) => {
    try {
        const newEmployee = new Employee(req.body);
        const savedEmployee = await newEmployee.save();
        res.status(201).json(savedEmployee);
    } catch (err) {
        res.status(500).json({ message: 'Error creating employee', error: err });
    }
});

// Update employee
router.put('/employees/:id', async (req, res) => {
    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedEmployee);
    } catch (err) {
        res.status(500).json({ message: 'Error updating employee', error: err });
    }
});

// --- Attendance Routes ---

// Get attendance for a specific date (or today)
router.get('/attendance', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date as string) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        const attendance = await Attendance.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        }).populate('employee', 'firstName lastName');
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance', error: err });
    }
});

// Mark Check-in
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Check if already checked in
        let attendance = await Attendance.findOne({
            employee: employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (attendance) {
            return res.status(400).json({ message: 'Already checked in for today' });
        }

        attendance = new Attendance({
            employee: employeeId,
            date: new Date(),
            checkIn: new Date(),
            status: 'Present'
        });

        await attendance.save();
        res.status(201).json(attendance);
    } catch (err) {
        res.status(500).json({ message: 'Error marking check-in', error: err });
    }
});

// Mark Check-out
router.post('/attendance/checkout', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const attendance = await Attendance.findOne({
            employee: employeeId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No check-in record found for today' });
        }

        attendance.checkOut = new Date();
        await attendance.save();
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ message: 'Error marking check-out', error: err });
    }
});

// --- Leave Routes ---

// Get all leave requests
router.get('/leaves', async (req, res) => {
    try {
        const leaves = await Leave.find().populate('employee', 'firstName lastName').sort({ createdAt: -1 });
        res.json(leaves);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching leaves', error: err });
    }
});

// Apply for leave
router.post('/leaves', async (req, res) => {
    try {
        const newLeave = new Leave(req.body);
        const savedLeave = await newLeave.save();
        res.status(201).json(savedLeave);
    } catch (err) {
        res.status(500).json({ message: 'Error applying for leave', error: err });
    }
});

// Update leave status (Approve/Reject)
router.put('/leaves/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedLeave = await Leave.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(updatedLeave);
    } catch (err) {
        res.status(500).json({ message: 'Error updating leave status', error: err });
    }
});

export default router;
