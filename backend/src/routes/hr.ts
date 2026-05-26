import express from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken, authorize } from '../middlewares/auth';
import { AuditLogger } from '../utils/auditLogger';

const router = express.Router();

router.use(verifyToken);

// --- Employee Routes ---

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(employees.map((emp: any) => ({ ...emp, _id: emp.id })));
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching employees', error: err.message });
    }
});

// Create new employee
router.post('/employees', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { data: savedEmployee, error } = await supabase
            .from('employees')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;

        await AuditLogger.log(
            (req as any).user.id,
            (req as any).user.username,
            'CREATE_EMPLOYEE',
            'Employee',
            savedEmployee.id,
            {
                name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
            }
        );

        res.status(201).json({ ...savedEmployee, _id: savedEmployee.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating employee', error: err.message });
    }
});

// Update employee
router.put('/employees/:id', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const { data: updatedEmployee, error } = await supabase
            .from('employees')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error || !updatedEmployee) throw error || new Error('Employee not found');

        await AuditLogger.log(
            (req as any).user.id,
            (req as any).user.username,
            'UPDATE_EMPLOYEE',
            'Employee',
            updatedEmployee.id,
            {
                name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
            }
        );

        res.json({ ...updatedEmployee, _id: updatedEmployee.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating employee', error: err.message });
    }
});

// --- Attendance Routes ---

// Get attendance for a specific date (or today)
router.get('/attendance', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date as string) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999)).toISOString();

        const { data: attendance, error } = await supabase
            .from('attendance')
            .select(`
                *,
                employee:employee (firstName, lastName)
            `)
            .gte('date', startOfDay)
            .lte('date', endOfDay);

        if (error) throw error;

        res.json(attendance.map((att: any) => ({ ...att, _id: att.id })));
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching attendance', error: err.message });
    }
});

// Mark Check-in
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Check if already checked in
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee', employeeId)
            .gte('date', startOfDay)
            .lte('date', endOfDay)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ message: 'Already checked in for today' });
        }

        const { data: attendance, error } = await supabase
            .from('attendance')
            .insert([{
                employee: employeeId,
                date: new Date().toISOString(),
                checkIn: new Date().toISOString(),
                status: 'Present'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...attendance, _id: attendance.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error marking check-in', error: err.message });
    }
});

// Mark Check-out
router.post('/attendance/checkout', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee', employeeId)
            .gte('date', startOfDay)
            .lte('date', endOfDay)
            .maybeSingle();

        if (error || !attendance) {
            return res.status(404).json({ message: 'No check-in record found for today' });
        }

        const { data: updated, error: updateErr } = await supabase
            .from('attendance')
            .update({ checkOut: new Date().toISOString() })
            .eq('id', attendance.id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        res.json({ ...updated, _id: updated.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error marking check-out', error: err.message });
    }
});

// --- Leave Routes ---

// Get all leave requests
router.get('/leaves', async (req, res) => {
    try {
        const { data: leaves, error } = await supabase
            .from('leaves')
            .select(`
                *,
                employee:employee (firstName, lastName)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(leaves.map((l: any) => ({ ...l, _id: l.id })));
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching leaves', error: err.message });
    }
});

// Apply for leave
router.post('/leaves', async (req, res) => {
    try {
        const { data: savedLeave, error } = await supabase
            .from('leaves')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...savedLeave, _id: savedLeave.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error applying for leave', error: err.message });
    }
});

// Update leave status (Approve/Reject)
router.put('/leaves/:id/status', authorize(['admin', 'manager']), async (req, res) => {
    try {
        const { status } = req.body;
        const { data: updatedLeave, error } = await supabase
            .from('leaves')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error || !updatedLeave) throw error || new Error('Leave request not found');

        await AuditLogger.log(
            (req as any).user.id,
            (req as any).user.username,
            'UPDATE_LEAVE_STATUS',
            'Leave',
            updatedLeave.id,
            {
                status,
            }
        );

        res.json({ ...updatedLeave, _id: updatedLeave.id });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating leave status', error: err.message });
    }
});

export default router;
