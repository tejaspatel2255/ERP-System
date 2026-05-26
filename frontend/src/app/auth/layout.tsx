import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                padding: '1rem',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: '2rem',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '1rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            letterSpacing: '-0.025em',
                        }}
                    >
                        ERP System
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Secure Enterprise Management</p>
                </div>
                {children}
            </div>
        </div>
    );
}
