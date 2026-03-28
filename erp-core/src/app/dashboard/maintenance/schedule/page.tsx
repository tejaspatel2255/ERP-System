'use client';

import React, { useState, useEffect } from 'react';
import { Asset, MaintenanceLog } from 'erp-shared';
import { MaintenanceService } from '@/services/maintenanceService';
import { Plus, Calendar, Wrench, AlertTriangle, CheckCircle, Clock, Check, PenTool } from 'lucide-react';

export default function MaintenanceSchedulePage() {
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<MaintenanceLog>>({
        asset: '',
        type: 'Scheduled',
        description: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        technician: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [logsData, assetsData] = await Promise.all([
                MaintenanceService.getLogs(),
                MaintenanceService.getAssets()
            ]);
            setLogs(logsData);
            setAssets(assetsData);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // @ts-ignore
            await MaintenanceService.createLog(formData);
            setShowForm(false);
            fetchData();
            setFormData({ asset: '', type: 'Scheduled', description: '', scheduledDate: new Date().toISOString().split('T')[0], technician: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const updateData: any = { status };
            if (status === 'Completed') {
                updateData.completionDate = new Date().toISOString();
            }
            await MaintenanceService.updateLogStatus(id, updateData);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const StatusColumn = ({ status, items }: { status: string, items: MaintenanceLog[] }) => {
        const getStatusColor = (s: string) => {
            if (s === 'Pending') return { border: 'border-l-4 border-yellow-400', badge: 'bg-yellow-100 text-yellow-800' };
            if (s === 'In Progress') return { border: 'border-l-4 border-blue-500', badge: 'bg-blue-100 text-blue-800' };
            return { border: 'border-l-4 border-green-500', badge: 'bg-green-100 text-green-800' };
        };

        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 0', borderBottom: '2px solid var(--border)'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</h3>
                    <span style={{
                        backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.75rem', borderRadius: '1rem',
                        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)'
                    }}>
                        {items.length}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map(log => (
                        <div key={log._id} className="card" style={{
                            padding: '1.25rem', borderLeft: status === 'Pending' ? '4px solid #FBBF24' : status === 'In Progress' ? '4px solid #60A5FA' : '4px solid #34D399',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{
                                    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '0.25rem', textTransform: 'uppercase',
                                    backgroundColor: log.type === 'Issue' ? '#FEF2F2' : '#EFF6FF',
                                    color: log.type === 'Issue' ? '#EF4444' : '#3B82F6'
                                }}>
                                    {log.type}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={12} /> {new Date(log.scheduledDate).toLocaleDateString()}
                                </span>
                            </div>

                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                                {(log.asset as Asset)?.name || 'Unknown Asset'}
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>{log.description}</p>

                            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    <div style={{ padding: '0.25rem', background: '#F3F4F6', borderRadius: '50%' }}>
                                        <Wrench size={12} />
                                    </div>
                                    {log.technician}
                                </div>

                                {status === 'Pending' && (
                                    <button onClick={() => updateStatus(log._id, 'In Progress')}
                                        style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                        Start
                                    </button>
                                )}
                                {status === 'In Progress' && (
                                    <button onClick={() => updateStatus(log._id, 'Completed')}
                                        style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--success)', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                        Complete
                                    </button>
                                )}
                                {status === 'Completed' && (
                                    <span style={{ color: 'var(--success)' }}><CheckCircle size={18} /></span>
                                )}
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No tasks
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Schedule</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Track maintenance tasks and issues.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--primary)', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    <Plus size={20} /> New Task
                </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                <StatusColumn status="Pending" items={logs.filter(l => l.status === 'Pending')} />
                <StatusColumn status="In Progress" items={logs.filter(l => l.status === 'In Progress')} />
                <StatusColumn status="Completed" items={logs.filter(l => l.status === 'Completed')} />
            </div>

            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
                }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Schedule Task</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Asset</label>
                                <select
                                    required
                                    className="input-field"
                                    value={formData.asset as string}
                                    onChange={e => setFormData({ ...formData, asset: e.target.value })}
                                >
                                    <option value="">Select Asset</option>
                                    {assets.map(a => (
                                        <option key={a._id} value={a._id}>{a.name} ({a.serialNumber})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Type</label>
                                    <select
                                        className="input-field"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Issue">Issue/Repair</option>
                                        <option value="Upgrade">Upgrade</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="input-field"
                                        value={formData.scheduledDate}
                                        onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Description</label>
                                <textarea
                                    required
                                    className="input-field"
                                    rows={3}
                                    placeholder="Describe the task or issue..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Technician</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Name of technician"
                                    className="input-field"
                                    value={formData.technician}
                                    onChange={e => setFormData({ ...formData, technician: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
