'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    Package,
    Briefcase,
    Settings,
    LogOut,
    ClipboardList,
    Bell,
    Factory,
    Wrench,
    Truck,
    DollarSign,
    Menu,
    X,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { InventoryService } from '@/services/inventoryService';
import { Alert } from 'erp-shared';
import { useSocket } from '@/context/SocketContext';
import AIChatBot from '@/components/AIChatBot';
import styles from './DashboardLayout.module.css'; // We will create this next

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { isConnected, socket } = useSocket();

    // Fetch Alerts periodically
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const data = await InventoryService.getAlerts();
                setAlerts(data);
            } catch (error) {
                console.error('Failed to fetch alerts', error);
            }
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    // Socket.io Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('notification', (newAlert: Alert) => {
            setAlerts(prev => [newAlert, ...prev]);
        });

        socket.on('new_order', (data: any) => {
            const orderAlert: Alert = {
                _id: Date.now().toString(),
                message: `🛒 ${data.message}`,
                type: 'SYSTEM',
                isRead: false,
                createdAt: new Date().toISOString()
            };
            setAlerts(prev => [orderAlert, ...prev]);
        });

        return () => {
            socket.off('notification');
            socket.off('new_order');
        };
    }, [socket]);

    const handleLogout = () => {
        document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        router.push('/auth/login');
    };

    const navItems = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
        { name: 'Dispatch', href: '/dashboard/dispatch', icon: Truck },
        { name: 'Production', href: '/dashboard/production/work-orders', icon: Factory },
        { name: 'Maintenance', href: '/dashboard/maintenance/assets', icon: Wrench },
        { name: 'Purchase', href: '/dashboard/purchase', icon: Briefcase },
        { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
        { name: 'Store Ledger', href: '/dashboard/inventory/ledger', icon: ClipboardList },
        { name: 'HR', href: '/dashboard/hr', icon: Users },
        { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ];

    const markRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await InventoryService.markAlertRead(id);
            setAlerts(alerts.filter(a => a._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className={styles.layoutContainer}>
            {/* Sidebar */}
            <aside
                className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}
                style={{
                    width: isMobile
                        ? (isSidebarOpen ? '100%' : '0px')
                        : (isSidebarOpen ? '280px' : '80px'),
                    zIndex: isMobile ? 50 : 20
                }}
            >
                <div className={styles.sidebarHeader} style={{ justifyContent: isSidebarOpen ? 'space-between' : 'center' }}>
                    {(isSidebarOpen || !isMobile) && (
                        <h1 className={styles.logo}>
                            Nexus<span style={{ color: 'var(--text-main)' }}>ERP</span>
                        </h1>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={styles.toggleBtn}
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => isMobile && setIsSidebarOpen(false)}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                style={{ justifyContent: (isSidebarOpen && !isMobile) || isMobile ? 'flex-start' : 'center' }}
                                title={!isSidebarOpen && !isMobile ? item.name : ''}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ minWidth: '22px' }} />
                                {(isSidebarOpen || isMobile) && (
                                    <>
                                        <span>{item.name}</span>
                                        {isActive && <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.logoutSection}>
                    <button
                        onClick={handleLogout}
                        className={styles.logoutBtn}
                        style={{ justifyContent: (isSidebarOpen && !isMobile) || isMobile ? 'flex-start' : 'center' }}
                        title="Logout"
                    >
                        <LogOut size={20} style={{ minWidth: '20px' }} />
                        {(isSidebarOpen || isMobile) && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={styles.main}
                style={{
                    marginLeft: isMobile ? '0px' : (isSidebarOpen ? '280px' : '80px'),
                    opacity: (isMobile && isSidebarOpen) ? 0.3 : 1, // Dim content when mobile sidebar is open
                    pointerEvents: (isMobile && isSidebarOpen) ? 'none' : 'auto'
                }}
            >
                {/* Floating Header */}
                <header className={styles.header}>
                    <div className={styles.breadcrumb}>
                        <LayoutDashboard size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}> / </span>
                        <span className={styles.pageTitle}>
                            {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
                        </span>
                    </div>

                    <div className={styles.headerActions}>
                        {/* Status Chip */}
                        <div className={styles.statusChip} style={{
                            background: isConnected ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--error-rgb), 0.1)',
                            border: `1px solid ${isConnected ? 'rgba(var(--success-rgb), 0.2)' : 'rgba(var(--error-rgb), 0.2)'}`,
                            color: isConnected ? 'var(--success)' : 'var(--error)'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: isConnected ? 'var(--success)' : 'var(--error)',
                                boxShadow: isConnected ? '0 0 8px var(--success)' : 'none'
                            }} />
                            {isConnected ? 'System Online' : 'Offline'}
                        </div>

                        {/* Notifications */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAlerts(!showAlerts)}
                                className={styles.notificationBtn}
                            >
                                <Bell size={20} />
                                {alerts.length > 0 && (
                                    <span className={styles.badge}>
                                        {alerts.length}
                                    </span>
                                )}
                            </button>

                            {showAlerts && (
                                <div className={`${styles.notificationDropdown} glass-card`}>
                                    <div className={styles.notificationHeader}>
                                        <span>Notifications</span>
                                        {alerts.length > 0 && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: 'var(--primary)',
                                                color: 'white',
                                                padding: '0.1rem 0.5rem',
                                                borderRadius: '1rem'
                                            }}>
                                                {alerts.length} New
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {alerts.length === 0 ? (
                                            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <Bell size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p style={{ fontSize: '0.9rem' }}>No new notifications</p>
                                            </div>
                                        ) : (
                                            alerts.map(alert => (
                                                <div key={alert._id} className={styles.notificationItem}>
                                                    <div style={{
                                                        background: 'rgba(var(--error-rgb), 0.1)',
                                                        padding: '0.5rem',
                                                        borderRadius: '50%',
                                                        color: 'var(--error)'
                                                    }}>
                                                        {alert.type === 'SYSTEM' ? <ShoppingCart size={16} /> : <AlertCircle size={16} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.25rem', fontWeight: 500, lineHeight: '1.4' }}>{alert.message}</p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(alert.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => markRead(alert._id, e)}
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-muted)',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="fade-in">
                    {children}
                </div>
                <AIChatBot />
            </main>
        </div>
    );
}
