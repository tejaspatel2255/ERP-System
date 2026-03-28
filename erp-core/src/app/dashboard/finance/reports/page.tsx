'use client';

import React, { useState, useEffect } from 'react';
import { FinanceService } from '@/services/financeService';
import { Account } from 'erp-shared';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react';

export default function FinancialReportsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useFormatCurrency();

    useEffect(() => {
        FinanceService.getAccounts().then(data => {
            setAccounts(data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
            <div className="spinner"></div>
            <div className="animate-pulse">Generating Reports...</div>
        </div>
    );

    const filterAccounts = (types: string[]) => accounts.filter(a => types.includes(a.type));
    const sumBalance = (accs: Account[]) => accs.reduce((sum, a) => sum + a.balance, 0);

    // Balance Sheet Data
    const assets = filterAccounts(['Asset']);
    const liabilities = filterAccounts(['Liability']);
    const equity = filterAccounts(['Equity']);

    const totalAssets = sumBalance(assets);
    const totalLiabilities = sumBalance(liabilities);
    const totalEquity = sumBalance(equity);

    // P&L Data
    const income = filterAccounts(['Income']);
    const expenses = filterAccounts(['Expense']);

    const totalIncome = sumBalance(income);
    const totalExpenses = sumBalance(expenses);
    const netIncome = totalIncome - totalExpenses;

    // Balance check
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity + netIncome)) < 1;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Financial Reports</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real-time snapshot of company finances.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Profit & Loss Statement */}
                <div className="card glass-card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#ECFDF5', color: '#059669' }}><TrendingUp size={20} /></div>
                        Profit & Loss Statement
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Revenue Section */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', marginBottom: '0.75rem', borderLeft: '3px solid var(--success)', paddingLeft: '0.5rem' }}>Revenue</h3>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                                {income.map(acc => (
                                    <div key={acc._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem', borderBottom: '1px dashed var(--border-light)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{acc.name}</span>
                                        <span style={{ fontWeight: 500 }}>{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {income.length === 0 && <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No revenue recorded</div>}
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
                                    <span>Total Revenue</span>
                                    <span style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Expenses Section */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--error)', marginBottom: '0.75rem', borderLeft: '3px solid var(--error)', paddingLeft: '0.5rem' }}>Expenses</h3>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                                {expenses.map(acc => (
                                    <div key={acc._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem', borderBottom: '1px dashed var(--border-light)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{acc.name}</span>
                                        <span style={{ fontWeight: 500 }}>{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {expenses.length === 0 && <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No expenses recorded</div>}
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
                                    <span>Total Expenses</span>
                                    <span style={{ color: 'var(--error)' }}>{formatCurrency(totalExpenses)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Income */}
                        <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Net Income</span>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>
                                {formatCurrency(netIncome)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="card glass-card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#EEF2FF', color: '#4F46E5' }}><Scale size={20} /></div>
                        Balance Sheet
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Assets */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '0.75rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.5rem' }}>Assets</h3>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Total Assets</span>
                                <span>{formatCurrency(totalAssets)}</span>
                            </div>
                        </div>

                        {/* Liabilities */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning)', marginBottom: '0.75rem', borderLeft: '3px solid var(--warning)', paddingLeft: '0.5rem' }}>Liabilities</h3>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Total Liabilities</span>
                                <span>{formatCurrency(totalLiabilities)}</span>
                            </div>
                        </div>

                        {/* Equity */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--info)', marginBottom: '0.75rem', borderLeft: '3px solid var(--info)', paddingLeft: '0.5rem' }}>Equity</h3>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                                {equity.map(acc => (
                                    <div key={acc._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem', borderBottom: '1px dashed var(--border-light)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{acc.name}</span>
                                        <span style={{ fontWeight: 500 }}>{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {/* Retained Earnings Visualization */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.5)' }}>
                                    <span>Current Period Earnings</span>
                                    <span>{formatCurrency(netIncome)}</span>
                                </div>
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
                                    <span>Total Equity</span>
                                    <span>{formatCurrency(totalEquity + netIncome)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', padding: '1rem', background: isBalanced ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${isBalanced ? '#A7F3D0' : '#FECACA'}`, borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                            <span style={{ color: isBalanced ? '#065F46' : '#991B1B', fontWeight: 600 }}>Assets = Liabilities + Equity</span>
                            <span style={{ fontWeight: 700, color: isBalanced ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isBalanced ? (
                                    <>Balanced <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }}></div></>
                                ) : (
                                    <>Unbalanced <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }}></div></>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
