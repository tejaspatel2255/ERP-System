'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseService } from '@/services/purchaseService';
import { Purchase } from 'shared';
import { Plus, Search, ShoppingBag, Calendar, User, FileText, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

export default function PurchasePage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    const { formatCurrency } = useFormatCurrency();

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const data = await PurchaseService.getAll();
            setPurchases(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchases = purchases.filter(
        (p) => p.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || p._id.includes(searchTerm)
    );

    if (loading)
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    minHeight: '400px',
                    flexDirection: 'column',
                    gap: '1rem',
                    color: 'var(--text-muted)',
                }}
            >
                <div className="spinner"></div>
                <div className="animate-pulse">Loading Purchases...</div>
            </div>
        );

    return (
        <div className="fade-in">
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
                        Purchase Orders
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Manage vendor orders and inventory procurement.
                    </p>
                </div>
                <button onClick={() => router.push('/dashboard/purchase/new')} className="btn-primary">
                    <Plus size={20} /> New Purchase
                </button>
            </div>

            {/* Stats Summary */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}
            >
                <div
                    className="card glass-card"
                    style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
                >
                    <div
                        style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.1)',
                        }}
                    >
                        <ShoppingBag size={28} />
                    </div>
                    <div>
                        <p
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Total Orders
                        </p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {purchases.length}
                        </p>
                    </div>
                </div>
                <div
                    className="card glass-card"
                    style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
                >
                    <div
                        style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)',
                        }}
                    >
                        <FileText size={28} />
                    </div>
                    <div>
                        <p
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Total Spend
                        </p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {formatCurrency(purchases.reduce((sum, p) => sum + p.totalAmount, 0))}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
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
                    placeholder="Search by vendor or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
            </div>

            {/* Purchases Table */}
            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border)' }}>
                                <th
                                    style={{
                                        padding: '1rem 1.5rem',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Order ID
                                </th>
                                <th
                                    style={{
                                        padding: '1rem 1.5rem',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Vendor
                                </th>
                                <th
                                    style={{
                                        padding: '1rem 1.5rem',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Date
                                </th>
                                <th
                                    style={{
                                        padding: '1rem 1.5rem',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Items
                                </th>
                                <th
                                    style={{
                                        padding: '1rem 1.5rem',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Total Amount
                                </th>
                                <th
                                    style={{
                                        padding: '1rem',
                                        textAlign: 'right',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchases.map((purchase) => (
                                <tr
                                    key={purchase._id}
                                    className="hover:bg-slate-50 transition-colors"
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                >
                                    <td
                                        style={{
                                            padding: '1rem 1.5rem',
                                            fontFamily:
                                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        #{purchase._id.slice(-6).toUpperCase()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#F3F4F6',
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                <User size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                {purchase.vendorName}
                                            </span>
                                        </div>
                                    </td>
                                    <td
                                        style={{
                                            padding: '1rem 1.5rem',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} className="text-muted" />
                                            {new Date(purchase.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td
                                        style={{
                                            padding: '1rem 1.5rem',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {purchase.items.length} items
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        {formatCurrency(purchase.totalAmount)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: '0.375rem',
                                                border: '1px solid var(--border)',
                                                background: 'white',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                transition: 'all 0.2s',
                                            }}
                                            title="View Details"
                                            className="hover:text-primary hover:border-primary"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPurchases.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding: '1.5rem',
                                                    backgroundColor: '#F3F4F6',
                                                    borderRadius: '50%',
                                                    color: '#9CA3AF',
                                                }}
                                            >
                                                <ShoppingBag size={48} />
                                            </div>
                                            <div>
                                                <h3
                                                    style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: 700,
                                                        color: 'var(--text-main)',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    No purchase orders found
                                                </h3>
                                                <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                                                    Create a new purchase order to restock inventory.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => router.push('/dashboard/purchase/new')}
                                                className="btn-primary"
                                                style={{ marginTop: '0.5rem' }}
                                            >
                                                Create Purchase
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
