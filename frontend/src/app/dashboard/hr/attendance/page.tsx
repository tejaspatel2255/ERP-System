'use client';

import React, { useState, useEffect } from 'react';
import { HRService } from '@/services/hrService';
import { Employee, Attendance } from 'shared';
import { CheckCircle, LogOut } from 'lucide-react';

export default function AttendancePage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [emps, atts] = await Promise.all([
                HRService.getAllEmployees(),
                HRService.getAttendance(selectedDate),
            ]);
            setEmployees(emps);
            setAttendanceList(atts);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (employeeId: string) => {
        try {
            await HRService.markCheckIn(employeeId);
            fetchData();
        } catch (error) {
            alert('Check-in failed');
        }
    };

    const handleCheckOut = async (employeeId: string) => {
        try {
            await HRService.markCheckOut(employeeId);
            fetchData();
        } catch (error) {
            alert('Check-out failed');
        }
    };

    // Map attendance to employees for easier rendering
    const employeeAttendanceMap = employees.map((emp) => {
        const record = attendanceList.find(
            (a) => (typeof a.employee === 'string' ? a.employee : a.employee._id) === emp._id
        );
        return {
            ...emp,
            attendanceRecord: record,
        };
    });

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
            >
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>Daily Attendance</h1>
                <input
                    type="date"
                    className="input-field"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ maxWidth: '200px' }}
                />
            </div>

            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Employee</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Check In</th>
                            <th style={{ padding: '1rem' }}>Check Out</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employeeAttendanceMap.map((item) => (
                            <tr key={item._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600 }}>
                                        {item.firstName} {item.lastName}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {item.department}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: item.attendanceRecord ? '#ECFDF5' : '#FEF2F2',
                                            color: item.attendanceRecord ? '#059669' : '#DC2626',
                                        }}
                                    >
                                        {item.attendanceRecord ? item.attendanceRecord.status : 'Absent'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {item.attendanceRecord?.checkIn
                                        ? new Date(item.attendanceRecord.checkIn).toLocaleTimeString()
                                        : '-'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {item.attendanceRecord?.checkOut
                                        ? new Date(item.attendanceRecord.checkOut).toLocaleTimeString()
                                        : '-'}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {!item.attendanceRecord ? (
                                        <button
                                            onClick={() => handleCheckIn(item._id)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.375rem',
                                                backgroundColor: '#059669',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <CheckCircle size={14} /> Check In
                                        </button>
                                    ) : (
                                        !item.attendanceRecord.checkOut && (
                                            <button
                                                onClick={() => handleCheckOut(item._id)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    backgroundColor: '#DC2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <LogOut size={14} /> Check Out
                                            </button>
                                        )
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
