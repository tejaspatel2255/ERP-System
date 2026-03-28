'use client';

import React, { useState, useEffect } from 'react';
import { Dispatch } from 'erp-shared';
import { DispatchService } from '@/services/dispatchService';
import { Search, Plus, Truck, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DispatchPage() {
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await DispatchService.getAll();
            setDispatches(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDispatches = dispatches.filter(d =>
        d.manifestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.order?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.carrier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return { bg: '#ECFDF5', text: '#059669', icon: <CheckCircle size={14} /> };
            case 'In Transit': return { bg: '#EFF6FF', text: '#2563EB', icon: <Truck size={14} /> };
            default: return { bg: '#F3F4F6', text: '#4B5563', icon: <Clock size={14} /> };
        }
    };

    if (loading) return <div>Loading Dispatches...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Dispatch & Logistics</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track shipments and delivery logs.</p>
                </div>
                <Link href="/dashboard/dispatch/new" className="btn-primary" style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                }}>
                    <Plus size={18} /> New Dispatch
                </Link>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search Manifest, Customer, or Carrier..."
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {filteredDispatches.map(dispatch => {
                    const statusStyle = getStatusColor(dispatch.status);
                    return (
                        <div key={dispatch._id} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', transition: 'transform 0.2s', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{dispatch.manifestNumber}</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Order ID: {dispatch.order?._id?.slice(-6).toUpperCase()}</p>
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                    backgroundColor: statusStyle.bg, color: statusStyle.text, display: 'flex', alignItems: 'center', gap: '0.25rem'
                                }}>
                                    {statusStyle.icon}
                                    {dispatch.status}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                                    <span style={{ fontWeight: 500 }}>{dispatch.order?.customerName || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Carrier:</span>
                                    <span style={{ fontWeight: 500 }}>{dispatch.carrier}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Vehicle:</span>
                                    <span style={{ fontWeight: 500 }}>{dispatch.vehicleNumber}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Dispatch Date:</span>
                                    <span style={{ fontWeight: 500 }}>{new Date(dispatch.dispatchDate).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <Link
                                    href={`/dashboard/dispatch/${dispatch._id}/challan`}
                                    style={{ flex: 1, padding: '0.5rem', textAlign: 'center', borderRadius: '0.375rem', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <FileText size={16} /> View Challan
                                </Link>
                                {/* Future: Add Upload POD Button */}
                            </div>
                        </div>
                    );
                })}

                {filteredDispatches.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '0.5rem' }}>
                        <p>No dispatches found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
