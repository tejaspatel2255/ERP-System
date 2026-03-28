'use client';

import React, { useState, useEffect } from 'react';
import { ProductionService } from '@/services/productionService';
import { BOM, WorkOrder } from 'erp-shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Play, CheckCircle, Package, Clock, AlertCircle } from 'lucide-react';

export default function WorkOrderPage() {
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [boms, setBoms] = useState<BOM[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form
    const [selectedBOM, setSelectedBOM] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [orderNumber, setOrderNumber] = useState('');

    useEffect(() => {
        fetchData();
        setOrderNumber(`WO-${Date.now().toString().slice(-6)}`);
    }, []);

    const fetchData = async () => {
        try {
            const [ordersData, bomsData] = await Promise.all([
                ProductionService.getWorkOrders(),
                ProductionService.getBOMs()
            ]);
            setOrders(ordersData);
            setBoms(bomsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const bom = boms.find(b => b._id === selectedBOM);
        if (!bom) return;

        try {
            await ProductionService.createWorkOrder({
                orderNumber,
                // @ts-ignore
                product: bom.product._id,
                // @ts-ignore
                bom: bom._id,
                quantity,
                startDate: new Date().toISOString()
            });
            setShowForm(false);
            fetchData();
            setOrderNumber(`WO-${Date.now().toString().slice(-6)}`);
        } catch (error) {
            alert('Failed to create Work Order');
        }
    };

    const updateStatus = async (id: string, status: string) => {
        if (!confirm(`Mark this order as ${status}? This will update inventory.`)) return;
        try {
            await ProductionService.updateWorkOrderStatus(id, status);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    if (loading) return <div>Loading Work Orders...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Work Orders</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track production jobs and status.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
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
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    <Plus size={18} /> {showForm ? 'Cancel' : 'New Work Order'}
                </button>
            </div>

            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '600px', maxWidth: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Create Production Order</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <Input label="Order #" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} required />
                                <Input label="Quantity to Produce" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required min={1} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Select Recipe (BOM)</label>
                                <select
                                    className="input-field"
                                    value={selectedBOM}
                                    onChange={e => setSelectedBOM(e.target.value)}
                                    required
                                >
                                    <option value="">Select BOM...</option>
                                    {boms.map(b => (
                                        <option key={b._id} value={b._id}>{b.name} (Produces: {b.product?.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Info</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Work Orders found.</td></tr>
                        ) : (
                            orders.map(wo => (
                                <tr key={wo._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{wo.orderNumber}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(wo.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Package size={16} className="text-muted" />
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{wo.product?.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{wo.bom?.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{wo.quantity}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            backgroundColor: wo.status === 'Completed' ? '#ECFDF5' : wo.status === 'In Progress' ? '#EFF6FF' : '#F3F4F6',
                                            color: wo.status === 'Completed' ? '#059669' : wo.status === 'In Progress' ? '#2563EB' : '#4B5563'
                                        }}>
                                            {wo.status === 'Completed' && <CheckCircle size={12} />}
                                            {wo.status === 'In Progress' && <Clock size={12} />}
                                            {wo.status === 'Pending' && <AlertCircle size={12} />}
                                            {wo.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        {wo.status === 'Pending' && (
                                            <button
                                                onClick={() => updateStatus(wo._id, 'In Progress')}
                                                style={{
                                                    padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--primary)',
                                                    background: 'white', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                                                }}
                                            >
                                                Start Production
                                            </button>
                                        )}
                                        {wo.status === 'In Progress' && (
                                            // @ts-ignore
                                            <button
                                                onClick={() => updateStatus(wo._id, 'Completed')}
                                                style={{
                                                    padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none',
                                                    background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                                                }}
                                            >
                                                Complete Order
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
