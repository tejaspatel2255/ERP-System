'use client';

import React, { useState, useEffect } from 'react';
import { SettingsService } from '@/services/settingsService';
import { Save, Shield, Bell, Database, Globe, Layers, Lock, Upload, Server, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await SettingsService.getAllSettings();
            if (Object.keys(data).length === 0) {
                await SettingsService.initializeDefaults();
                const newData = await SettingsService.getAllSettings();
                setSettings(newData);
            } else {
                setSettings(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await SettingsService.updateSettings(settings);
            alert('Settings saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to update settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'var(--text-muted)',
                }}
            >
                <div className="animate-pulse">Loading Configuration...</div>
            </div>
        );

    const tabs = [
        { id: 'general', label: 'General', icon: Globe, desc: 'Organization & Locale' },
        { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords & Access' },
        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email & Alerts' },
        { id: 'modules', label: 'Modules', icon: Layers, desc: 'Feature Toggles' },
        { id: 'data', label: 'Data', icon: Database, desc: 'Backup & Restore' },
        { id: 'logs', label: 'Logs', icon: Server, desc: 'System Activity' },
    ];

    return (
        <div>
            {/* Header */}
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '1.875rem',
                            fontWeight: 800,
                            color: 'var(--text-main)',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        System Configuration
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Manage global system settings and preferences.
                    </p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Sidebar Navigation */}
                <div
                    className="card"
                    style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: isActive ? 'var(--bg-color)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: isActive ? 600 : 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                }}
                            >
                                <Icon size={18} />
                                <div style={{ flex: 1 }}>
                                    <div>{tab.label}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>{tab.desc}</div>
                                </div>
                                {isActive && <ChevronRight size={16} />}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div style={{ minHeight: '500px' }}>
                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <div className="card">
                            <h2
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    paddingBottom: '1rem',
                                    borderBottom: '1px solid var(--border)',
                                }}
                            >
                                <Globe size={20} className="text-primary" /> General Information
                            </h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label className="label">Organization Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={settings.orgName || ''}
                                        onChange={(e) => handleChange('orgName', e.target.value)}
                                        placeholder="e.g. Nexus Corp"
                                    />
                                </div>
                                <div>
                                    <label className="label">Contact Email</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        value={settings.contactEmail || ''}
                                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">Default Currency</label>
                                    <select
                                        className="input-field"
                                        value={settings.currency || 'USD'}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="INR">INR (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Date Format</label>
                                    <select
                                        className="input-field"
                                        value={settings.dateFormat || 'YYYY-MM-DD'}
                                        onChange={(e) => handleChange('dateFormat', e.target.value)}
                                    >
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label className="label">Organization Logo</label>
                                    <div
                                        style={{
                                            border: '2px dashed var(--border)',
                                            borderRadius: '0.5rem',
                                            padding: '3rem',
                                            textAlign: 'center',
                                            color: 'var(--text-muted)',
                                            cursor: 'not-allowed',
                                            backgroundColor: '#F9FAFB',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: '0.75rem',
                                                background: '#EEF2FF',
                                                borderRadius: '50%',
                                                color: 'var(--primary)',
                                            }}
                                        >
                                            <Upload size={24} />
                                        </div>
                                        <p style={{ fontWeight: 500 }}>Click to upload or drag and drop</p>
                                        <p style={{ fontSize: '0.875rem' }}>SVG, PNG, JPG (max. 800x400px)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Settings (Placeholder/Coming Soon) */}
                    {activeTab === 'security' && (
                        <div className="card">
                            <h2
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    paddingBottom: '1rem',
                                    borderBottom: '1px solid var(--border)',
                                }}
                            >
                                <Shield size={20} className="text-primary" /> Security Policies
                            </h2>
                            <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '1rem',
                                        }}
                                    >
                                        <div>
                                            <h3 style={{ fontWeight: 600 }}>Password Policy</h3>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                Define complexity requirements for user passwords.
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                background: '#E0E7FF',
                                                color: 'var(--primary)',
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            COMING SOON
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label className="label">Minimum Length</label>
                                            <input type="number" className="input-field" defaultValue={8} />
                                        </div>
                                        <div>
                                            <label className="label">Password Expiry (Days)</label>
                                            <input type="number" className="input-field" defaultValue={90} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '1rem',
                                        }}
                                    >
                                        <div>
                                            <h3 style={{ fontWeight: 600 }}>Session Management</h3>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                Control user session duration and timeouts.
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '1rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.5rem',
                                            background: '#F9FAFB',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked
                                            readOnly
                                            style={{ width: '1.2rem', height: '1.2rem' }}
                                        />
                                        <div>
                                            <p style={{ fontWeight: 500 }}>Enforce session timeout</p>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                Automatically log out users after 30 minutes of inactivity.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Tabs (Generic Coming Soon) */}
                    {['notifications', 'modules', 'data', 'logs'].includes(activeTab) && (
                        <div
                            className="card"
                            style={{
                                padding: '4rem',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '400px',
                            }}
                        >
                            <div
                                style={{
                                    width: '5rem',
                                    height: '5rem',
                                    background: '#F3F4F6',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <Lock size={40} />
                            </div>
                            <h2
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    marginBottom: '0.75rem',
                                    color: 'var(--text-main)',
                                }}
                            >
                                {tabs.find((t) => t.id === activeTab)?.label} Coming Soon
                            </h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '450px', lineHeight: '1.6' }}>
                                The <strong>{tabs.find((t) => t.id === activeTab)?.label}</strong> module is currently
                                under development. We are preparing the backend infrastructure to support this feature
                                in the upcoming release.
                            </p>
                            <div style={{ marginTop: '2.5rem' }}>
                                <button className="btn-secondary" onClick={() => setActiveTab('general')}>
                                    Return to General Settings
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
