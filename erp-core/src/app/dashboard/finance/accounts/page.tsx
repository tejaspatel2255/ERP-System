'use client';

import React, { useState, useEffect } from 'react';
import { FinanceService } from '@/services/financeService';
import { Account } from 'erp-shared';
import { Plus, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

export default function ChartOfAccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useFormatCurrency();

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const data = await FinanceService.getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        if (!confirm('This will insert default accounts. Continue?')) return;
        try {
            await FinanceService.seedDefaults();
            fetchAccounts();
        } catch (error) {
            console.error(error);
            alert('Failed to seed accounts (maybe they already exist?)');
        }
    };

    const groupAccounts = (type: string) => accounts.filter(a => a.type === type);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px', color: 'var(--text-muted)', gap: '1rem', flexDirection: 'column' }}>
            <div className="spinner"></div>
            <div className="animate-pulse">Loading Chart of Accounts...</div>
        </div>
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Chart of Accounts</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>View and manage your general ledger accounts.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleSeed} className="btn-secondary">
                        <RefreshCw size={18} /> Seed Defaults
                    </button>
                    <button className="btn-primary">
                        <Plus size={18} /> Add Account
                    </button>
                </div>
            </div>

            {accounts.length === 0 && (
                <div className="card glass-panel" style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: '#F3F4F6', borderRadius: '50%', color: 'var(--text-muted)' }}>
                        <FileText size={48} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Accounts Found</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>Get started by seeding the default chart of accounts for a standard business setup.</p>
                    </div>
                    <button onClick={handleSeed} className="btn-primary">
                        Seed Default Accounts <ArrowRight size={18} />
                    </button>
                </div>
            )}

            {accounts.length > 0 && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(type => {
                        const typeAccounts = groupAccounts(type);
                        if (typeAccounts.length === 0) return null;

                        return (
                            <div key={type} className="card glass-card">
                                <div style={{
                                    padding: '1.25rem 1.5rem',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(248, 250, 252, 0.5)'
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                                        {type}s
                                    </h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {typeAccounts.length} Accounts
                                    </span>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--bg-color)' }}>
                                                <th style={{ padding: '0.875rem 1.5rem', width: '120px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Code</th>
                                                <th style={{ padding: '0.875rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Account Name</th>
                                                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Balance</th>
                                                <th style={{ padding: '0.875rem 1.5rem', width: '100px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {typeAccounts.map(account => (
                                                <tr key={account._id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '1rem 1.5rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                        {account.code}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                                        {account.name}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                                                        {formatCurrency(account.balance)}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <button style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }} className="hover:text-primary">
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
