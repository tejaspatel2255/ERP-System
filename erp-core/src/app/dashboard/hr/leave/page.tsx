'use client';

import React, { useState, useEffect } from 'react';
import { HRService } from '@/services/hrService';
import { Employee, Leave } from 'erp-shared';
import { Button } from '@/components/ui/Button';

export default function LeavePage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        employee: '',
        startDate: '',
        endDate: '',
        type: 'Casual' as any,
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [emps, lvs] = await Promise.all([
                HRService.getAllEmployees(),
                HRService.getAllLeaves()
            ]);
            setEmployees(emps);
            setLeaves(lvs);
            if (emps.length > 0) setFormData(prev => ({ ...prev, employee: emps[0]._id }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await HRService.applyLeave(formData);
            setShowForm(false);
            fetchData();
        } catch (error) {
            alert('Failed to apply for leave');
        }
    };

    const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected') => {
        try {
            await HRService.updateLeaveStatus(id, status);
            fetchData();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>Leave Management</h1>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel Application' : 'Apply for Leave'}
                </Button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#F9FAFB' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>New Leave Application</h3>
                    <form onSubmit={handleApply} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="block text-sm font-medium mb-1">Employee</label>
                            <select
                                className="input-field"
                                value={formData.employee}
                                onChange={e => setFormData({ ...formData, employee: e.target.value })}
                            >
                                {employees.map(e => (
                                    <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                className="input-field"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="Sick">Sick Leave</option>
                                <option value="Casual">Casual Leave</option>
                                <option value="Earned">Earned Leave</option>
                                <option value="Unpaid">Unpaid Leave</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="block text-sm font-medium mb-1">Reason</label>
                            <textarea
                                className="input-field"
                                rows={3}
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                required
                            ></textarea>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Button type="submit">Submit Request</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Employee</th>
                            <th style={{ padding: '1rem' }}>Type</th>
                            <th style={{ padding: '1rem' }}>Dates</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaves.map(leave => (
                            <tr key={leave._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    {typeof leave.employee === 'object' ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Unknown'}
                                </td>
                                <td style={{ padding: '1rem' }}>{leave.type}</td>
                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        backgroundColor: leave.status === 'Approved' ? '#ECFDF5' : leave.status === 'Rejected' ? '#FEF2F2' : '#FFFBEB',
                                        color: leave.status === 'Approved' ? '#059669' : leave.status === 'Rejected' ? '#DC2626' : '#D97706'
                                    }}>
                                        {leave.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {leave.status === 'Pending' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleStatusUpdate(leave._id, 'Approved')}
                                                style={{ fontSize: '0.8rem', color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(leave._id, 'Rejected')}
                                                style={{ fontSize: '0.8rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {leaves.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
