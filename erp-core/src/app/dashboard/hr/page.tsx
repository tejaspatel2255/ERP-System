'use client';

import React, { useState, useEffect } from 'react';
import { HRService } from '@/services/hrService';
import { Employee } from 'erp-shared';
import { Plus, Search, User, Mail, Phone, Briefcase, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function HRPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const data = await HRService.getAllEmployees();
            setEmployees(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div className="animate-pulse">Loading Employees...</div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>HR & Payroll</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage employees, attendance, and leaves.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/dashboard/hr/attendance">
                        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
                            <Calendar size={18} /> Attendance
                        </button>
                    </Link>
                    <Link href="/dashboard/hr/leave">
                        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
                            <User size={18} /> Leaves
                        </button>
                    </Link>
                    <Link href="/dashboard/hr/new">
                        <button
                            className="btn-primary"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white',
                                borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                            }}
                        >
                            <Plus size={20} /> Add Employee
                        </button>
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '2rem', maxWidth: '400px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
            </div>

            {/* Employee Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {filteredEmployees.map(employee => (
                    <div key={employee._id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>
                                {employee.firstName[0]}{employee.lastName[0]}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{employee.firstName} {employee.lastName}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{employee.role}</p>
                            </div>
                            <span style={{
                                marginLeft: 'auto',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: employee.status === 'Active' ? '#ECFDF5' : '#FEF2F2',
                                color: employee.status === 'Active' ? '#059669' : '#DC2626'
                            }}>
                                {employee.status}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Briefcase size={16} /> {employee.department}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} /> {employee.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} /> {employee.phone}
                            </div>
                        </div>

                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                            <Link href={`/dashboard/hr/${employee._id}`} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                                View Profile &rarr;
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {filteredEmployees.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <p>No employees found.</p>
                </div>
            )}
        </div>
    );
}
