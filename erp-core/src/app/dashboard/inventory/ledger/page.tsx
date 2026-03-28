'use client';

import React, { useEffect, useState } from 'react';
import { InventoryService } from '@/services/inventoryService';
import { StoreLedger } from 'erp-shared';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function StoreLedgerPage() {
    const [ledger, setLedger] = useState<StoreLedger[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const data = await InventoryService.getLedger();
                setLedger(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Ledger...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link href="/dashboard/inventory" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Store Ledger (Stock History)</h1>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                        <tr style={{ textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '1rem' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Product</th>
                            <th style={{ padding: '1rem' }}>Type</th>
                            <th style={{ padding: '1rem' }}>Quantity</th>
                            <th style={{ padding: '1rem' }}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ledger.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No stock movements recorded yet.
                                </td>
                            </tr>
                        ) : (
                            ledger.map((entry) => (
                                <tr key={entry._id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '1rem' }}>
                                        {new Date(entry.date).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                        {entry.product?.name || 'Unknown Product'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: entry.type === 'IN' ? '#DCFCE7' : '#FEE2E2',
                                            color: entry.type === 'IN' ? '#166534' : '#991B1B'
                                        }}>
                                            {entry.type === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                                        {entry.quantity}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                        {entry.remarks}
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
