'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InventoryService } from '@/services/inventoryService';
import { AnalyticsService, ForecastData } from '@/services/analyticsService';
import { Product } from 'erp-shared';
import ForecastChart from '@/components/dashboard/ForecastChart';
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react';

export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productData, forecastData] = await Promise.all([
                    InventoryService.getProduct(id),
                    AnalyticsService.getForecast(id)
                ]);
                setProduct(productData);
                setForecast(forecastData);
            } catch (error) {
                console.error('Failed to fetch product details', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (!product) return <div style={{ padding: '2rem' }}>Product not found</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', marginBottom: '1rem'
                    }}
                >
                    <ArrowLeft size={20} /> Back to Inventory
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{product.name}</h1>
                        <p style={{ color: 'var(--text-muted)' }}>SKU: {product.sku || 'N/A'} • Category: {product.category || 'Uncategorized'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>₹{product.price}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Current Stock: {product.stock} {product.unit}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Product Stats */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: '#EEF2FF', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                            <Package size={20} />
                        </div>
                        <h3 style={{ fontWeight: 600 }}>Stock Level</h3>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{product.stock}</div>
                    <div style={{ fontSize: '0.875rem', color: product.stock <= (product.minLevel || 10) ? 'var(--error)' : 'var(--success)' }}>
                        {product.stock <= (product.minLevel || 10) ? 'Low Stock Warning' : 'Healthy Stock Level'}
                    </div>
                </div>

                {/* Forecast Insight */}
                {forecast && (
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.5rem', background: '#FEF3C7', borderRadius: '0.5rem', color: '#D97706' }}>
                                <AlertTriangle size={20} />
                            </div>
                            <h3 style={{ fontWeight: 600 }}>AI Insight</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Predicted Demand</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{forecast.predictedNextMonth} units</div>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Recommendation</div>
                                <div style={{
                                    fontSize: '1.125rem', fontWeight: 600,
                                    color: forecast.recommendation.includes('Critical') ? 'var(--error)' : 'var(--success)'
                                }}>
                                    {forecast.recommendation}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Forecast Chart */}
            {forecast && (
                <div style={{ marginBottom: '2rem' }}>
                    <ForecastChart data={forecast} />
                </div>
            )}
        </div>
    );
}
