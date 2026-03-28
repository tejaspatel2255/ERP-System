'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, FileText, PieChart, TrendingUp } from 'lucide-react';

export default function FinanceDashboard() {
    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Finance & Accounting</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage chart of accounts, journal entries, and financial reports.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Chart of Accounts */}
                <Link href="/dashboard/finance/accounts" className="card" style={{ display: 'block', textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#EEF2FF', color: 'var(--primary)' }}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Chart of Accounts</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage assets, liabilities, and equity.</p>
                        </div>
                    </div>
                </Link>

                {/* Journal Entries */}
                <Link href="/dashboard/finance/journal" className="card" style={{ display: 'block', textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#ECFDF5', color: '#059669' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Journal Entries</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Record manual financial transactions.</p>
                        </div>
                    </div>
                </Link>

                {/* Financial Reports */}
                <Link href="/dashboard/finance/reports" className="card" style={{ display: 'block', textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#FFF7ED', color: '#D97706' }}>
                            <PieChart size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Financial Reports</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>View Balance Sheet and P&L.</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
