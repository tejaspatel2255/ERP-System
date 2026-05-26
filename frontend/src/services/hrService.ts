import axios from 'axios';
import { Employee, Attendance, Leave } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const HRService = {
    // --- Employees ---
    getAllEmployees: async (): Promise<Employee[]> => {
        const response = await axios.get(`${API_URL}/hr/employees`, { withCredentials: true });
        return response.data;
    },

    createEmployee: async (data: Partial<Employee>): Promise<Employee> => {
        const response = await axios.post(`${API_URL}/hr/employees`, data, { withCredentials: true });
        return response.data;
    },

    updateEmployee: async (id: string, data: Partial<Employee>): Promise<Employee> => {
        const response = await axios.put(`${API_URL}/hr/employees/${id}`, data, { withCredentials: true });
        return response.data;
    },

    // --- Attendance ---
    getAttendance: async (date?: string): Promise<Attendance[]> => {
        const query = date ? `?date=${date}` : '';
        const response = await axios.get(`${API_URL}/hr/attendance${query}`, { withCredentials: true });
        return response.data;
    },

    markCheckIn: async (employeeId: string): Promise<Attendance> => {
        const response = await axios.post(
            `${API_URL}/hr/attendance/checkin`,
            { employeeId },
            { withCredentials: true }
        );
        return response.data;
    },

    markCheckOut: async (employeeId: string): Promise<Attendance> => {
        const response = await axios.post(
            `${API_URL}/hr/attendance/checkout`,
            { employeeId },
            { withCredentials: true }
        );
        return response.data;
    },

    // --- Leave ---
    getAllLeaves: async (): Promise<Leave[]> => {
        const response = await axios.get(`${API_URL}/hr/leaves`, { withCredentials: true });
        return response.data;
    },

    applyLeave: async (data: Partial<Leave>): Promise<Leave> => {
        const response = await axios.post(`${API_URL}/hr/leaves`, data, { withCredentials: true });
        return response.data;
    },

    updateLeaveStatus: async (id: string, status: 'Approved' | 'Rejected'): Promise<Leave> => {
        const response = await axios.put(`${API_URL}/hr/leaves/${id}/status`, { status }, { withCredentials: true });
        return response.data;
    },
};
