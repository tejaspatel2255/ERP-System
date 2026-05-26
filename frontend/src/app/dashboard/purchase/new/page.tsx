'use client';

import React, { useState, useEffect } from 'react';
import { ProductService } from '@/services/productService';
import { PurchaseService } from '@/services/purchaseService';
import { Product, PurchaseItem } from 'shared';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Search, User, Package, CreditCard, ShoppingCart, ShoppingBag } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

export default function NewPurchasePage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<PurchaseItem[]>([]);
    const { formatCurrency, currency } = useFormatCurrency();

    const [vendorName, setVendorName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [costPrice, setCostPrice] = useState<string>(''); // Allow empty string for input

    useEffect(() => {
        const loadData = async () => {
            try {
                const p = await ProductService.getAll();
                setProducts(p);
            } catch (error) {
                console.error('Failed to load products', error);
            }
        };
        loadData();
    }, []);

    const addToCart = () => {
        const product = products.find((p) => p._id === selectedProduct);
        if (!product) return;

        const cost = parseFloat(costPrice) || 0;
        if (cost <= 0) {
            alert('Please enter a valid cost price');
            return;
        }

        const existing = cart.find((item) => item.product._id === product._id);
        if (existing) {
            setCart(
                cart.map((item) =>
                    item.product._id === product._id
                        ? {
                              ...item,
                              quantity: item.quantity + 1,
                              total: (item.quantity + 1) * item.cost,
                          }
                        : item
                )
            );
        } else {
            setCart([
                ...cart,
                {
                    product,
                    name: product.name,
                    quantity: 1,
                    cost: cost,
                    total: cost,
                },
            ]);
        }
        setCostPrice(''); // Reset cost input
        setSelectedProduct('');
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter((item) => item.product._id !== productId));
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (qty < 1) return;
        setCart(
            cart.map((item) =>
                item.product._id === productId
                    ? {
                          ...item,
                          quantity: qty,
                          total: qty * item.cost,
                      }
                    : item
            )
        );
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);

    const handleSubmit = async () => {
        if (!vendorName || cart.length === 0) return alert('Enter vendor name and add items');
        try {
            await PurchaseService.create({
                vendorName,
                items: cart.map((i) => ({
                    productId: i.product._id,
                    quantity: i.quantity,
                    cost: i.cost,
                })),
            });
            router.push('/dashboard/purchase');
        } catch (error) {
            console.error(error);
            alert('Failed to create purchase order');
        }
    };

    const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchProduct.toLowerCase()));

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <button
                onClick={() => router.back()}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                }}
                className="hover:text-primary transition-colors"
            >
                <ArrowLeft size={18} /> Back to Purchases
            </button>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                    gap: '2rem',
                    alignItems: 'start',
                }}
            >
                {/* Left Column: Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Vendor Details */}
                    <div className="card glass-card">
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-main)',
                            }}
                        >
                            <User size={20} className="text-primary" /> Vendor Details
                        </h3>
                        <div>
                            <label className="label">Vendor Name</label>
                            <input
                                type="text"
                                className="input-field"
                                value={vendorName}
                                onChange={(e) => setVendorName(e.target.value)}
                                placeholder="e.g. Acme Supplies Ltd."
                            />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="card glass-card" style={{ flex: 1 }}>
                        <h3
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-main)',
                            }}
                        >
                            <Package size={20} className="text-primary" /> Add Products
                        </h3>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
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
                                    placeholder="Search products..."
                                    className="input-field"
                                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                                    value={searchProduct}
                                    onChange={(e) => setSearchProduct(e.target.value)}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                            }}
                        >
                            {filteredProducts.map((p) => (
                                <div
                                    key={p._id}
                                    className="hover:bg-slate-50 transition-colors"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border-light)',
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Current Stock: {p.stock} {p.unit}
                                        </div>
                                    </div>

                                    {selectedProduct === p._id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    Cost ({currency})
                                                </span>
                                                <input
                                                    type="number"
                                                    value={costPrice}
                                                    onChange={(e) => setCostPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    style={{
                                                        width: '80px',
                                                        padding: '0.25rem',
                                                        borderRadius: '0.25rem',
                                                        border: '1px solid var(--primary)',
                                                        outline: 'none',
                                                    }}
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                onClick={addToCart}
                                                className="btn-primary"
                                                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct('');
                                                    setCostPrice('');
                                                }}
                                                style={{
                                                    padding: '0.4rem',
                                                    color: 'var(--text-muted)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedProduct(p._id);
                                                setCostPrice('');
                                            }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.375rem',
                                                border: '1px solid var(--border)',
                                                background: 'white',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                            }}
                                            className="hover:border-primary hover:text-primary transition-all"
                                        >
                                            Select
                                        </button>
                                    )}
                                </div>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No products found matching "{searchProduct}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart Summary */}
                <div className="card glass-card" style={{ height: 'fit-content', position: 'sticky', top: '2rem' }}>
                    <h3
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text-main)',
                        }}
                    >
                        <ShoppingCart size={22} className="text-primary" /> Order Summary
                    </h3>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            marginBottom: '2rem',
                            maxHeight: '50vh',
                            overflowY: 'auto',
                        }}
                    >
                        {cart.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '3rem 1rem',
                                    color: 'var(--text-muted)',
                                    border: '2px dashed var(--border-light)',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(255,255,255,0.3)',
                                }}
                            >
                                <ShoppingBag size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p>Order is empty</p>
                                <p style={{ fontSize: '0.8rem' }}>
                                    Add items from the list to create a purchase order.
                                </p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.product._id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingBottom: '1rem',
                                        borderBottom: '1px solid var(--border-light)',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {formatCurrency(item.cost)} x
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                min="1"
                                                onChange={(e) =>
                                                    updateQuantity(item.product._id, parseInt(e.target.value) || 1)
                                                }
                                                style={{
                                                    width: '40px',
                                                    marginLeft: '0.5rem',
                                                    padding: '0.1rem',
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid var(--border)',
                                                    textAlign: 'center',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                            {formatCurrency(item.total)}
                                        </span>
                                        <button
                                            onClick={() => removeFromCart(item.product._id)}
                                            style={{
                                                color: '#EF4444',
                                                background: '#FEF2F2',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.35rem',
                                                borderRadius: '0.375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            title="Remove Item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1.5rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '1.5rem',
                                alignItems: 'center',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Total Payable
                            </span>
                            <span
                                style={{
                                    fontSize: '1.75rem',
                                    fontWeight: 800,
                                    color: 'var(--primary)',
                                    letterSpacing: '-0.025em',
                                }}
                            >
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0 || !vendorName}
                            className="btn-primary"
                            style={{ width: '100%' }}
                        >
                            <CreditCard size={20} /> Complete Purchase
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
