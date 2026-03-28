'use client';

import React, { useState, useEffect } from 'react';
import { ProductionService } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { BOM, Product } from 'erp-shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Layers, Trash2, FileText, Component } from 'lucide-react';

export default function BOMPage() {
    const [boms, setBoms] = useState<BOM[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [notes, setNotes] = useState('');
    const [materials, setMaterials] = useState<{ material: string, quantity: number }[]>([{ material: '', quantity: 1 }]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [bomsData, productsData] = await Promise.all([
                ProductionService.getBOMs(),
                ProductService.getAll()
            ]);
            setBoms(bomsData);
            setProducts(productsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = () => {
        setMaterials([...materials, { material: '', quantity: 1 }]);
    };

    const handleMaterialChange = (index: number, field: string, value: any) => {
        const newMaterials = [...materials];
        // @ts-ignore
        newMaterials[index][field] = value;
        setMaterials(newMaterials);
    };

    const handleRemoveMaterial = (index: number) => {
        const newMaterials = materials.filter((_, i) => i !== index);
        setMaterials(newMaterials);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ProductionService.createBOM({
                name,
                // @ts-ignore
                product: selectedProduct,
                // @ts-ignore
                materials
            });
            setShowForm(false);
            fetchData();
            // Reset Form
            setName('');
            setSelectedProduct('');
            setNotes('');
            setMaterials([{ material: '', quantity: 1 }]);
        } catch (error) {
            alert('Failed to create BOM');
        }
    };

    const filteredBOMs = boms.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div>Loading BOMs...</div>;

    const finishedGoods = products.filter(p => p.type === 'finished_good');
    const rawMaterials = products.filter(p => p.type === 'raw_material');

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Bill of Materials</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage product recipes and compositions.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary"
                    style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    <Plus size={18} /> {showForm ? 'Cancel' : 'Create BOM'}
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Search BOMs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                />
            </div>

            {/* Form */}
            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '700px', maxWidth: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>New BOM Definition</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <Input label="BOM Name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Standard Table Recipe" />
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Finished Good (Output)</label>
                                    <select
                                        className="input-field"
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Product...</option>
                                        {finishedGoods.map(p => (
                                            <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#F9FAFB', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Raw Materials (Ingredients)</label>
                                {materials.map((item, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 2 }}>
                                            <select
                                                className="input-field"
                                                value={item.material}
                                                onChange={e => handleMaterialChange(index, 'material', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Material...</option>
                                                {rawMaterials.map(m => (
                                                    <option key={m._id} value={m._id}>{m.name} (Stock: {m.stock} {m.unit})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ width: '100px' }}>
                                            <Input
                                                label=""
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => handleMaterialChange(index, 'quantity', Number(e.target.value))}
                                                required
                                                placeholder="Qty"
                                                min={0.1}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMaterial(index)}
                                            style={{ marginTop: '0.25rem', padding: '0.6rem', color: 'var(--error)', background: 'white', border: '1px solid var(--border)', borderRadius: '0.375rem', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={handleAddMaterial} style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Material
                                </Button>
                            </div>

                            <Input label="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} />

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create BOM</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOM Name</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Finished Good</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingredients</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBOMs.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No BOMs found.</td></tr>
                        ) : (
                            filteredBOMs.map(bom => (
                                <tr key={bom._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: '#EEF2FF', borderRadius: '0.375rem', color: 'var(--primary)' }}>
                                                <Layers size={18} />
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{bom.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Component size={16} className="text-muted" />
                                            <span style={{ fontWeight: 500 }}>{bom.product?.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {bom.materials.map((m: any, i) => (
                                                <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D1D5DB' }}></span>
                                                    {m.material?.name}: {m.quantity} {m.material?.unit}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{bom.notes || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
