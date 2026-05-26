'use client';

import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import styles from './Dashboard.module.css';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('7d');

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`, {
            credentials: 'include',
        })
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading)
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <div className="animate-pulse">Loading Dashboard...</div>
            </div>
        );
    if (!data) return <div>Error loading data</div>;

    const salesChartData = {
        labels: data.sales.map((d: any) => d.date),
        datasets: [
            {
                label: 'Sales (₹)',
                data: data.sales.map((d: any) => d.amount),
                borderColor: '#6366f1', // Primary
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const purchaseChartData = {
        labels: data.purchases.map((d: any) => d.date),
        datasets: [
            {
                label: 'Purchase (₹)',
                data: data.purchases.map((d: any) => d.amount),
                backgroundColor: '#0ea5e9', // Secondary
                borderRadius: 4,
                hoverBackgroundColor: '#0284c7',
            },
        ],
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#f8fafc',
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
            },
        },
        scales: {
            y: {
                grid: { color: 'rgba(0,0,0,0.05)' },
                border: { display: false },
                ticks: { font: { family: 'Inter' } },
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { family: 'Inter' } },
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    };

    const StatCard = ({ title, value, icon: Icon, color, bg, href }: any) => (
        <Link href={href} className={styles.statCard}>
            <div>
                <p className={styles.statTitle}>{title}</p>
                <h3 className={styles.statValue}>{value}</h3>
            </div>
            <div className={styles.statIcon} style={{ backgroundColor: bg, color: color }}>
                <Icon size={24} />
            </div>
        </Link>
    );

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Overview</h1>
                    <p className={styles.subtitle}>Here's what's happening with your business today.</p>
                </div>

                <div className={styles.controls}>
                    {['1d', '7d', '1m', '1y'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`${styles.filterBtn} ${timeFilter === filter ? styles.filterBtnActive : ''}`}
                        >
                            {filter.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Sales"
                    value={`₹${data.totals.sales.toLocaleString()}`}
                    icon={TrendingUp}
                    color="#6366f1"
                    bg="#e0e7ff"
                    href="/dashboard/sales"
                />
                <StatCard
                    title="Total Purchases"
                    value={`₹${data.totals.purchases.toLocaleString()}`}
                    icon={TrendingDown}
                    color="#0ea5e9"
                    bg="#e0f2fe"
                    href="/dashboard/purchase"
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={data.alertCount}
                    icon={AlertCircle}
                    color="#ef4444"
                    bg="#fee2e2"
                    href="/dashboard/inventory/ledger"
                />
            </div>

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Sales Trend</h3>
                        <Link href="/dashboard/sales" className={styles.chartLink}>
                            View Report <ArrowUpRight size={16} />
                        </Link>
                    </div>
                    <div className={styles.chartContainer}>
                        <Line data={salesChartData} options={chartOptions} />
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Purchase Overview</h3>
                        <Link href="/dashboard/purchase" className={styles.chartLink}>
                            View Report <ArrowUpRight size={16} />
                        </Link>
                    </div>
                    <div className={styles.chartContainer}>
                        <Bar data={purchaseChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>Critical Inventory Alerts</h3>
                    <span className={styles.alertBadge}>{data.alerts.length} Items Require Attention</span>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Product</th>
                                <th className={styles.th}>Current Stock</th>
                                <th className={styles.th}>Min Level</th>
                                <th className={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.alerts.map((alert: any) => (
                                <tr key={alert.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        <div className={styles.productCell}>
                                            <div className={styles.productIcon}>
                                                <Package size={16} />
                                            </div>
                                            {alert.item}
                                        </div>
                                    </td>
                                    <td className={styles.td} style={{ color: 'var(--error)', fontWeight: 600 }}>
                                        {alert.currentStock}
                                    </td>
                                    <td className={styles.td}>{alert.minLevel}</td>
                                    <td className={styles.td}>
                                        <Link href="/dashboard/purchase" className={styles.actionBtn}>
                                            Restock
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {data.alerts.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}
                                    >
                                        Running smoothly! No low stock alerts.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
