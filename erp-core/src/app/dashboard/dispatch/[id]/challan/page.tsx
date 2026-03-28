'use client';

import React, { useState, useEffect } from 'react';
import { Dispatch } from 'erp-shared';
import { DispatchService } from '@/services/dispatchService';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DeliveryChallanPage({ params }: { params: { id: string } }) {
    const [dispatch, setDispatch] = useState<Dispatch | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Unwrap params if necessary in Next.js 15+, but for 14 it's direct. 
        // Adapting to standardized fetch for safety.
        fetchData();
    }, [params.id]);

    const fetchData = async () => {
        try {
            const data = await DispatchService.getById(params.id);
            setDispatch(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading Challan...</div>;
    if (!dispatch) return <div>Dispatch Record Not Found</div>;

    const { order, carrier, driverName, vehicleNumber, dispatchDate, manifestNumber } = dispatch;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <Button variant="outline" onClick={() => window.history.back()}>
                    <ArrowLeft size={16} /> Back
                </Button>
                <Button onClick={() => window.print()}>
                    <Printer size={16} /> Print Challan
                </Button>
            </div>

            <div id="challan" style={{
                background: 'white', padding: '3rem', border: '1px solid #ddd',
                boxShadow: '0 0 10px rgba(0,0,0,0.05)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>DELIVERY CHALLAN</h1>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '1.1rem', fontWeight: 600 }}>ACME ERP SOLUTIONS PVT LTD.</p>
                    <p style={{ margin: 0, color: '#666' }}>123 Business Park, City Name, State - 400001</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div style={{}}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Consignee (Ship To):</h3>
                        <p style={{ margin: 0, fontWeight: 600 }}>{order.customerName}</p>
                        <p style={{ margin: 0, color: '#444' }}>{order.customer?.address || 'Address Not Available'}</p>
                        <p style={{ margin: 0, color: '#444' }}>Ph: {order.customer?.phone}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 0.5rem' }}><strong>Manifest #:</strong> {manifestNumber}</p>
                        <p style={{ margin: '0 0 0.5rem' }}><strong>Date:</strong> {new Date(dispatchDate).toLocaleDateString()}</p>
                        <p style={{ margin: 0 }}><strong>Ref Order:</strong> #{order._id.slice(-6).toUpperCase()}</p>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Logistics Details:</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #ddd', padding: '1rem' }}>
                        <div><strong>Carrier:</strong> {carrier}</div>
                        <div><strong>Vehicle:</strong> {vehicleNumber}</div>
                        <div><strong>Driver:</strong> {driverName}</div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #333' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>#</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Item Description</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index}>
                                <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{index + 1}</td>
                                <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{item.name}</td>
                                <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'center' }}>{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ height: '60px', borderBottom: '1px solid #333', width: '200px', marginBottom: '0.5rem' }}></div>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Receiver's Signature & Stamp</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ height: '60px', borderBottom: '1px solid #333', width: '200px', marginBottom: '0.5rem' }}></div>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Authorized Signatory</p>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                    This is a computer generated document.
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .card { box-shadow: none; border: none; }
                }
            `}</style>
        </div>
    );
}
