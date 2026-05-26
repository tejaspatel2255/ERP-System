'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HRService } from '@/services/hrService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewEmployeePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        role: 'Employee' as any,
        joiningDate: new Date().toISOString().split('T')[0],
        salary: 0,
        status: 'Active' as any,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await HRService.createEmployee(formData);
            router.push('/dashboard/hr');
        } catch (error) {
            alert('Failed to create employee');
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2rem' }}>
                Add New Employee
            </h1>

            <div className="card" style={{ padding: '2rem' }}>
                <form
                    onSubmit={handleSubmit}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
                >
                    <Input
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />

                    <Input
                        label="Department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required
                    />

                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--text-main)',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Role
                        </label>
                        <select
                            className="input-field"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        >
                            <option value="Employee">Employee</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <Input
                        label="Joining Date"
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                        required
                    />

                    <Input
                        label="Salary (CTC)"
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                        required
                    />

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <Button type="button" variant="outline" onClick={() => router.back()} style={{ flex: 1 }}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ flex: 1 }}>
                            Add Employee
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
