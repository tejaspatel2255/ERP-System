'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SalesService } from '@/services/salesService';
import { DispatchService } from '@/services/dispatchService';
import { Sale } from 'shared';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Truck, User, Calendar, FileText } from 'lucide-react';

function NewDispatchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedOrderId = searchParams.get('orderId') || '';

    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        orderId: preSelectedOrderId,
        carrier: '',
        driverName: '',
        vehicleNumber: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        manifestNumber: `MN-${Date.now().toString().slice(-8)}`,
    });

    useEffect(() => {
        fetchSales();
    }, []);

    // Update formData if preSelectedOrderId changes (e.g. navigation)
    useEffect(() => {
        if (preSelectedOrderId) {
            setFormData((prev) => ({ ...prev, orderId: preSelectedOrderId }));
        }
    }, [preSelectedOrderId]);

    const fetchSales = async () => {
        try {
            const data = await SalesService.getAll();
            // Filter only 'Completed' sales for dispatch? Or any? Let's show all for now, maybe filter later.
            // Ideally only show sales that haven't been dispatched yet.
            setSales(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await DispatchService.create(formData);
            router.push('/dashboard/dispatch');
        } catch (error) {
            alert('Failed to create dispatch');
        }
    };

    const selectedOrder = sales.find((s) => s._id === formData.orderId);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2rem' }}>
                Create Dispatch Manifest
            </h1>

            <div className="card" style={{ padding: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Section 1: Order Selection */}
                    <div>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <FileText size={18} /> Select Order
                        </h3>
                        <select
                            className="input-field"
                            value={formData.orderId}
                            onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                            required
                        >
                            <option value="">-- Select Sales Order --</option>
                            {sales.map((sale) => (
                                <option key={sale._id} value={sale._id}>
                                    Order #{sale._id.slice(-6).toUpperCase()} - {sale.customerName} - ₹
                                    {sale.totalAmount.toLocaleString()} ({new Date(sale.date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>

                        {selectedOrder && (
                            <div
                                style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Order Details:</div>
                                <ul
                                    style={{
                                        paddingLeft: '1.5rem',
                                        margin: 0,
                                        fontSize: '0.9rem',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <li>
                                        <strong>Customer:</strong> {selectedOrder.customerName}
                                    </li>
                                    <li>
                                        <strong>Items:</strong> {selectedOrder.items.length} items
                                    </li>
                                    <li>
                                        <strong>Status:</strong> {selectedOrder.status}
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)' }}></div>

                    {/* Section 2: Logistics Info */}
                    <div>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <Truck size={18} /> Logistics Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <Input
                                label="Manifest Number"
                                value={formData.manifestNumber}
                                onChange={(e) => setFormData({ ...formData, manifestNumber: e.target.value })}
                                required
                            />
                            <Input
                                label="Dispatch Date"
                                type="date"
                                value={formData.dispatchDate}
                                onChange={(e) => setFormData({ ...formData, dispatchDate: e.target.value })}
                                required
                            />
                            <Input
                                label="Carrier / Transport Company"
                                value={formData.carrier}
                                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                                required
                                placeholder="e.g. FedEx, Local Courier"
                            />
                            <Input
                                label="Vehicle Number"
                                value={formData.vehicleNumber}
                                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                required
                                placeholder="e.g. MH-12-AB-1234"
                            />
                            <div style={{ gridColumn: '1 / -1' }}>
                                <Input
                                    label="Driver Name"
                                    value={formData.driverName}
                                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <Button type="button" variant="outline" onClick={() => router.back()} style={{ flex: 1 }}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ flex: 1 }}>
                            Create Dispatch
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewDispatchPage() {
    return (
        <Suspense fallback={<div>Loading Dispatch Form...</div>}>
            <NewDispatchContent />
        </Suspense>
    );
}
