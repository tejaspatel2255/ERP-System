'use client';

import React, { useState, useEffect } from 'react';
import { CustomerService } from '@/services/customerService';
import { ProductService } from '@/services/productService';
import { SalesService } from '@/services/salesService';
import { Customer, Product, SaleItem } from 'erp-shared';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Search, User, Package, CreditCard } from 'lucide-react';

export default function NewSalePage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<SaleItem[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [searchProduct, setSearchProduct] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const [c, p] = await Promise.all([CustomerService.getAll(), ProductService.getAll()]);
            setCustomers(c);
            setProducts(p);
        };
        loadData();
    }, []);

    const addToCart = () => {
        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        const existing = cart.find(item => item.product._id === product._id);
        if (existing) {
            setCart(cart.map(item => item.product._id === product._id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item));
        } else {
            setCart([...cart, { product, name: product.name, quantity: 1, price: product.price, total: product.price }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product._id !== productId));
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(item => item.product._id === productId ? { ...item, quantity: qty, total: qty * item.price } : item));
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);

    const handleSubmit = async () => {
        if (!selectedCustomer || cart.length === 0) return alert('Select customer and items');
        try {
            await SalesService.create({
                customerId: selectedCustomer,
                items: cart.map(i => ({ productId: i.product._id, quantity: i.quantity })),
                status: 'Completed'
            });
            router.push('/dashboard/sales');
        } catch (error) {
            alert('Failed to create order');
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()));

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <button
                onClick={() => router.back()}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginBottom: '1.5rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500
                }}
            >
                <ArrowLeft size={18} /> Back to Sales
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Left Column: Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Customer Selection */}
                    <div className="card">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={20} color="var(--primary)" /> Customer Details
                        </h3>
                        <div style={{ position: 'relative' }}>
                            <select
                                className="input-field"
                                value={selectedCustomer}
                                onChange={e => setSelectedCustomer(e.target.value)}
                                style={{ padding: '0.75rem' }}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={20} color="var(--primary)" /> Add Items
                        </h3>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={searchProduct}
                                    onChange={e => setSearchProduct(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                            {filteredProducts.map(p => (
                                <div key={p._id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'white'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock: {p.stock} {p.unit}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 600 }}>₹{p.price}</span>
                                        <button
                                            onClick={() => { setSelectedProduct(p._id); addToCart(); }}
                                            style={{
                                                padding: '0.5rem', borderRadius: '0.375rem',
                                                border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer'
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart Summary */}
                <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={20} /> Order Summary
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '0.5rem' }}>
                                Cart is empty
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{item.price} x {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 600 }}>₹{item.total}</span>
                                        <button
                                            onClick={() => removeFromCart(item.product._id)}
                                            style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0 || !selectedCustomer}
                            style={{
                                width: '100%', padding: '1rem', borderRadius: '0.5rem', border: 'none',
                                background: cart.length === 0 || !selectedCustomer ? 'var(--text-muted)' : 'var(--primary)',
                                color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                        >
                            Complete Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
