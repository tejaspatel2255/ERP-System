'use client';

import React, { useState, useEffect } from 'react';
import { SalesService } from '@/services/salesService';
import { Sale } from 'erp-shared';
import { Plus, Search, ShoppingCart, Calendar, User, FileText, Truck, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const data = await SalesService.getAll();
            setSales(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = sales.filter(s =>
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s._id.includes(searchTerm)
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed': return { bg: '#ECFDF5', color: '#059669' };
            case 'Pending': return { bg: '#FFFBEB', color: '#D97706' };
            case 'Cancelled': return { bg: '#FEF2F2', color: '#DC2626' };
            default: return { bg: '#F3F4F6', color: '#4B5563' };
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div className="animate-pulse">Loading Sales...</div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Sales</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track orders and revenue.</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/sales/new')}
                    className="btn-primary"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white',
                        borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    <Plus size={20} /> New Order
                </button>
            </div>

            {/* Stats Summary (Optional Mini-Dashboard) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border)' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#EEF2FF', color: 'var(--primary)' }}>
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Orders</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{sales.length}</p>
                    </div>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search by customer or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                />
            </div>

            {/* Sales Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map(sale => {
                            const statusStyle = getStatusStyle(sale.status || 'Completed');
                            return (
                                <tr key={sale._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        #{sale._id.slice(-6).toUpperCase()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ padding: '0.25rem', borderRadius: '50%', backgroundColor: '#F3F4F6' }}>
                                                <User size={14} color="var(--text-muted)" />
                                            </div>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{sale.customerName}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {new Date(sale.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                        {sale.items.length} items
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        ₹{sale.totalAmount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.color
                                        }}>
                                            {sale.status || 'Completed'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {sale.status === 'Completed' && (
                                                <button
                                                    onClick={() => window.location.href = `/dashboard/dispatch/new?orderId=${sale._id}`}
                                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--primary)', background: 'white', cursor: 'pointer', color: 'var(--primary)' }}
                                                    title="Create Dispatch"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '1.5rem', backgroundColor: '#F3F4F6', borderRadius: '50%' }}>
                                            <FileText size={40} color="#9CA3AF" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>No orders found</h3>
                                            <p style={{ fontSize: '0.9rem' }}>Create a new sale to get started.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
