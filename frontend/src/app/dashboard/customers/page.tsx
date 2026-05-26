'use client';

import React, { useState, useEffect } from 'react';
import { CustomerService } from '@/services/customerService';
import { Customer } from 'shared';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, User, Building } from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });

    const fetchCustomers = async () => {
        try {
            const data = await CustomerService.getAll();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '', address: '' });
        setIsEditing(false);
        setCurrentId('');
        setShowForm(false);
    };

    const handleEdit = (customer: Customer) => {
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address || '',
        });
        setCurrentId(customer._id);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await CustomerService.update(currentId, formData);
            } else {
                await CustomerService.create(formData);
            }
            resetForm();
            fetchCustomers();
        } catch (error) {
            alert('Failed to save customer');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await CustomerService.delete(id);
            fetchCustomers();
        } catch (error) {
            alert('Failed to delete customer');
        }
    };

    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '1.875rem',
                            fontWeight: 800,
                            color: 'var(--text-main)',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        Customers
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage your client base.</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="btn-primary"
                    style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                    }}
                >
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                <Search
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                    }}
                />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Customers Grid (Cards instead of table for variety/responsiveness) */}
            <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}
            >
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer._id}
                        className="card"
                        style={{
                            padding: '1.5rem',
                            border: '1px solid var(--border)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: '#EEF2FF',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        {customer.name}
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        ID: {customer._id.slice(-6).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleEdit(customer)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(customer._id)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <Mail size={16} /> {customer.email}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <Phone size={16} /> {customer.phone}
                            </div>
                            {customer.address && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <MapPin size={16} /> {customer.address}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredCustomers.length === 0 && !loading && (
                    <div
                        style={{
                            gridColumn: '1 / -1',
                            padding: '3rem',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            border: '2px dashed var(--border)',
                            borderRadius: '0.5rem',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <User size={40} color="var(--border)" />
                            <p>No customers found.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '2rem',
                            borderRadius: '1rem',
                            width: '500px',
                            maxWidth: '90%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                marginBottom: '1.5rem',
                                color: 'var(--text-main)',
                            }}
                        >
                            {isEditing ? 'Edit Customer' : 'Add New Customer'}
                        </h2>
                        <form
                            onSubmit={handleSubmit}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                        >
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Name
                                </label>
                                <input
                                    className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Email
                                </label>
                                <input
                                    className="input-field"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Phone
                                </label>
                                <input
                                    className="input-field"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Address
                                </label>
                                <textarea
                                    className="input-field"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={3}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                        background: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {isEditing ? 'Save Changes' : 'Create Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
