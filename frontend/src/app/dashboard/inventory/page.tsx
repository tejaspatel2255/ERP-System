'use client';

import React, { useState, useEffect } from 'react';
import { ProductService } from '@/services/productService';
import { Product } from 'shared';
import { Search, Trash2, Edit2, Package, AlertTriangle, Plus, Filter, X } from 'lucide-react';

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        price: 0,
        stock: 0,
        minLevel: 10,
        unit: 'pcs',
        type: 'finished_good',
        unitCost: 0,
    });

    const fetchProducts = async () => {
        try {
            const data = await ProductService.getAll();
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            category: '',
            price: 0,
            stock: 0,
            minLevel: 10,
            unit: 'pcs',
            type: 'finished_good',
            unitCost: 0,
        });
        setIsEditing(false);
        setCurrentId('');
        setShowForm(false);
    };

    const handleEdit = (product: Product) => {
        setFormData({
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            stock: product.stock,
            minLevel: product.minLevel,
            unit: product.unit,
            // @ts-ignore
            type: product.type || 'finished_good',
            // @ts-ignore
            unitCost: product.unitCost || 0,
        });
        setCurrentId(product._id);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                ...formData,
                type: formData.type,
                unitCost: formData.unitCost,
            };

            if (isEditing) {
                await ProductService.update(currentId, payload);
            } else {
                await ProductService.create(payload);
            }
            resetForm();
            fetchProducts();
        } catch (error) {
            alert('Failed to save product');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await ProductService.delete(id);
            fetchProducts();
        } catch (error) {
            alert('Failed to delete product');
        }
    };

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
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
                        Inventory
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Manage stock, products, and raw materials.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => (window.location.href = '/dashboard/inventory/ledger')}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'white',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        <Package size={18} /> View Ledger
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
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
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                        }}
                    >
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '350px' }}>
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
                        placeholder="Search products, SKU, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Product Details
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Category
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Stock Status
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Pricing
                            </th>
                            <th
                                style={{
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
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
                                            <Package size={40} color="#9CA3AF" />
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
                                                No products found
                                            </h3>
                                            <p style={{ fontSize: '0.9rem' }}>
                                                Try adjusting your search or add a new product.
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((p) => (
                                <tr
                                    key={p._id}
                                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                >
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '0.5rem',
                                                    backgroundColor: '#EEF2FF',
                                                    color: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '1.1rem',
                                                }}
                                            >
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                    {p.name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)',
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    {p.sku}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                backgroundColor: '#F3F4F6',
                                                borderRadius: '1rem',
                                                fontSize: '0.8rem',
                                                color: 'var(--text-muted)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {p.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                {p.stock}{' '}
                                                <span
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    {p.unit}
                                                </span>
                                            </div>
                                            {p.stock <= p.minLevel && (
                                                <span
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        fontSize: '0.75rem',
                                                        color: '#B91C1C',
                                                        backgroundColor: '#FEF2F2',
                                                        padding: '0.1rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <AlertTriangle size={12} /> Low
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        ₹{p.price.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEdit(p)}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid var(--border)',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                                                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p._id)}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid var(--border)',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--error)')}
                                                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '2rem',
                            borderRadius: '1rem',
                            width: '600px',
                            maxWidth: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem',
                            }}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {isEditing ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button
                                onClick={resetForm}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Product Name
                                    </label>
                                    <input
                                        className="input-field"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g. Wooden Chair"
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        SKU
                                    </label>
                                    <input
                                        className="input-field"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        required
                                        disabled={isEditing}
                                        placeholder="e.g. CHR-001"
                                        style={{ backgroundColor: isEditing ? '#F3F4F6' : 'white' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Category
                                    </label>
                                    <input
                                        className="input-field"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                        placeholder="e.g. Furniture"
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Unit
                                    </label>
                                    <input
                                        className="input-field"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        required
                                        placeholder="e.g. pcs, kg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    Type
                                </label>
                                <select
                                    className="input-field"
                                    value={formData.type}
                                    // @ts-ignore
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="finished_good">Finished Good</option>
                                    <option value="raw_material">Raw Material</option>
                                    <option value="service">Service</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Selling Price (₹)
                                    </label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                {formData.type === 'raw_material' && (
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Cost Price (₹)
                                        </label>
                                        <input
                                            className="input-field"
                                            type="number"
                                            value={formData.unitCost}
                                            onChange={(e) =>
                                                setFormData({ ...formData, unitCost: Number(e.target.value) })
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Current Stock
                                    </label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Min Level
                                    </label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        value={formData.minLevel}
                                        onChange={(e) => setFormData({ ...formData, minLevel: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                        background: 'white',
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
                                    {isEditing ? 'Update Product' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
