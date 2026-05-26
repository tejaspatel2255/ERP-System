'use client';

import React, { useState, useEffect } from 'react';
import { Asset } from 'shared';
import { MaintenanceService } from '@/services/maintenanceService';
import { Plus, Search, Truck, Server, Box, Wrench, AlertCircle } from 'lucide-react';

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: '',
        type: 'Machinery',
        serialNumber: '',
        status: 'Active',
        location: '',
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const data = await MaintenanceService.getAssets();
            setAssets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // @ts-ignore
            await MaintenanceService.createAsset({ ...formData, purchaseDate: new Date().toISOString() });
            setShowForm(false);
            fetchAssets();
            setFormData({ name: '', type: 'Machinery', serialNumber: '', status: 'Active', location: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Vehicle':
                return <Truck size={20} />;
            case 'IT Equipment':
                return <Server size={20} />;
            case 'Machinery':
                return <Wrench size={20} />;
            default:
                return <Box size={20} />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Active':
                return { bg: '#ECFDF5', color: '#059669', border: '#10B981' };
            case 'Under Maintenance':
                return { bg: '#FFFBEB', color: '#D97706', border: '#F59E0B' };
            case 'Retired':
                return { bg: '#F3F4F6', color: '#6B7280', border: '#9CA3AF' };
            default:
                return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
        }
    };

    const filteredAssets = assets.filter(
        (a) =>
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        Assets
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Manage and track your company equipment.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-dark)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                    <Plus size={20} /> Add Asset
                </button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {/* Assets Table */}
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr
                            style={{
                                borderBottom: '1px solid var(--border)',
                                textAlign: 'left',
                                backgroundColor: '#F9FAFB',
                            }}
                        >
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Name
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Serial Number
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Location
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Status
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Added On
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAssets.map((asset) => {
                            const statusStyle = getStatusStyle(asset.status);
                            return (
                                <tr
                                    key={asset._id}
                                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                >
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div
                                                style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: 'var(--bg-color)',
                                                    borderRadius: '0.75rem',
                                                    color: 'var(--primary)',
                                                    border: '1px solid var(--border)',
                                                }}
                                            >
                                                {getIcon(asset.type)}
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.95rem',
                                                    }}
                                                >
                                                    {asset.name}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {asset.type}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td
                                        style={{
                                            padding: '1rem 1.5rem',
                                            fontFamily: 'monospace',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {asset.serialNumber}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                        {asset.location}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                backgroundColor: statusStyle.bg,
                                                color: statusStyle.color,
                                                border: `1px solid ${statusStyle.bg === '#F3F4F6' ? 'transparent' : statusStyle.bg}`,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: statusStyle.color,
                                                    marginRight: '0.5rem',
                                                }}
                                            ></span>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            padding: '1rem 1.5rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {new Date(asset.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredAssets.length === 0 && !loading && (
                            <tr>
                                <td
                                    colSpan={5}
                                    style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '1rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: '1.5rem',
                                                backgroundColor: '#F3F4F6',
                                                borderRadius: '50%',
                                            }}
                                        >
                                            <Box size={40} color="#9CA3AF" />
                                        </div>
                                        <div>
                                            <h3
                                                style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    color: 'var(--text-main)',
                                                    marginBottom: '0.25rem',
                                                }}
                                            >
                                                No assets found
                                            </h3>
                                            <p style={{ fontSize: '0.9rem' }}>
                                                Get started by adding your first asset.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowForm(true)}
                                            style={{
                                                marginTop: '0.5rem',
                                                color: 'var(--primary)',
                                                fontWeight: 600,
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            + Add New Asset
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 50,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '2rem',
                            borderRadius: '1rem',
                            width: '500px',
                            maxWidth: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                                color: 'var(--text-main)',
                            }}
                        >
                            Add Asset
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Enter the details of the new equipment or vehicle.
                        </p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    Asset Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Delivery Truck #4"
                                    className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        Type
                                    </label>
                                    <select
                                        className="input-field"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Machinery">Machinery</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="IT Equipment">IT Equipment</option>
                                        <option value="Furniture">Furniture</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        Serial Number
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="SN-12345"
                                        className="input-field"
                                        value={formData.serialNumber}
                                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    Location
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Warehouse A, Zone 2"
                                    className="input-field"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                        background: 'white',
                                        color: 'var(--text-main)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                                    }}
                                >
                                    Add Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
