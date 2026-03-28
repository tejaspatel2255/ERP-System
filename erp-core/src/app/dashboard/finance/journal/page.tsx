'use client';

import React, { useState, useEffect } from 'react';
import { FinanceService } from '@/services/financeService';
import { Account } from 'erp-shared';
import { Save, Plus, Trash2, Calendar, FileText, Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface EntryLine {
    account: string;
    debit: string; // Keep as string for input handling
    credit: string;
}

export default function JournalEntryPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [lines, setLines] = useState<EntryLine[]>([
        { account: '', debit: '', credit: '' },
        { account: '', debit: '', credit: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const { formatCurrency, currency } = useFormatCurrency();

    useEffect(() => {
        FinanceService.getAccounts().then(setAccounts);
    }, []);

    const addLine = () => {
        setLines([...lines, { account: '', debit: '', credit: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 2) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const updateLine = (index: number, field: keyof EntryLine, value: string) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // Auto-clear opposite field if converting from debit to credit or vice versa
        if (field === 'debit' && value !== '') newLines[index].credit = '0';
        if (field === 'credit' && value !== '') newLines[index].debit = '0';

        setLines(newLines);
    };

    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleSubmit = async () => {
        if (!isBalanced) return alert('Transaction must be balanced (Debits = Credits)');
        if (!description) return alert('Description is required');

        setLoading(true);
        try {
            await FinanceService.createJournalEntry({
                date,
                description,
                reference,
                entries: lines.map(line => ({
                    account: line.account,
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0
                })),
                status: 'Posted'
            });
            alert('Journal Entry Posted!');
            router.push('/dashboard/finance/reports');
        } catch (error) {
            console.error(error);
            alert('Failed to post transaction');
        } finally {
            setLoading(false);
        }
    };

    const accountOptions = accounts.map(acc => ({
        value: acc._id,
        label: `${acc.code} - ${acc.name}`
    }));

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>New Journal Entry</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manually record a financial transaction.</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !isBalanced}
                    className="btn-primary"
                    style={{ opacity: isBalanced ? 1 : 0.5, boxShadow: isBalanced ? 'var(--shadow-glow)' : 'none' }}
                >
                    <Save size={18} /> {loading ? 'Posting...' : 'Post Entry'}
                </button>
            </div>

            <div className="card glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <FileText size={20} className="text-primary" /> Entry Details
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                    <Input
                        label="Description"
                        placeholder="e.g. Monthly Rent Payment"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                    <Input
                        label="Reference (Optional)"
                        placeholder="e.g. INV-001"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                    />
                </div>

                <div style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '0.75rem 1rem', width: '40%', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Account</th>
                                    <th style={{ padding: '0.75rem 1rem', width: '25%', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Debit ({currency})</th>
                                    <th style={{ padding: '0.75rem 1rem', width: '25%', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Credit ({currency})</th>
                                    <th style={{ padding: '0.75rem 1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <Select
                                                label=""
                                                options={accountOptions}
                                                value={line.account}
                                                onChange={e => updateLine(index, 'account', e.target.value)}
                                                placeholder="Select Account"
                                                style={{ marginBottom: 0 }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <Input
                                                label=""
                                                type="number"
                                                value={line.debit}
                                                onChange={e => updateLine(index, 'debit', e.target.value)}
                                                placeholder="0.00"
                                                style={{ marginBottom: 0, textAlign: 'right' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <Input
                                                label=""
                                                type="number"
                                                value={line.credit}
                                                onChange={e => updateLine(index, 'credit', e.target.value)}
                                                placeholder="0.00"
                                                style={{ marginBottom: 0, textAlign: 'right' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => removeLine(index)}
                                                style={{
                                                    background: '#FEF2F2',
                                                    border: '1px solid #FECACA',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginTop: '6px'
                                                }}
                                                title="Remove Line"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 700, background: '#F8FAFC' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <button onClick={addLine} className="btn" style={{
                                            background: 'var(--surface)',
                                            border: '1px solid var(--primary)',
                                            color: 'var(--primary)',
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.875rem'
                                        }}>
                                            <Plus size={16} /> Add Line
                                        </button>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.1rem', color: isBalanced ? 'var(--text-main)' : '#EF4444' }}>
                                        {formatCurrency(totalDebit)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.1rem', color: isBalanced ? 'var(--text-main)' : '#EF4444' }}>
                                        {formatCurrency(totalCredit)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {!isBalanced && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '0.5rem',
                        color: '#B91C1C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600
                    }}>
                        Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </div>
                )}
            </div>
        </div>
    );
}
