import React from 'react';
import Link from 'next/link';

export default function Home() {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', // Indigo-950 to Indigo-900
                color: 'white',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    maxWidth: '800px',
                    animation: 'fadeIn 0.5s ease-out',
                }}
            >
                <h1
                    style={{
                        fontSize: '3.5rem',
                        fontWeight: 800,
                        marginBottom: '1rem',
                        letterSpacing: '-0.025em',
                    }}
                >
                    Enterprise Resource Planning
                </h1>
                <p
                    style={{
                        fontSize: '1.25rem',
                        color: '#c7d2fe', // Indigo-200
                        marginBottom: '3rem',
                        lineHeight: 1.6,
                    }}
                >
                    A unified platform to manage Sales, Purchasing, Inventory, and HR.
                    <br />
                    Secure, Scalable, and Designed for Desktop Productivity.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link
                        href="/auth/login"
                        style={{
                            padding: '1rem 2rem',
                            background: 'white',
                            color: '#312e81',
                            borderRadius: '0.5rem',
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.2s',
                            textDecoration: 'none',
                        }}
                    >
                        Login to Dashboard
                    </Link>
                    <Link
                        href="/auth/register"
                        style={{
                            padding: '1rem 2rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            borderRadius: '0.5rem',
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            transition: 'background 0.2s',
                            textDecoration: 'none',
                        }}
                    >
                        Create Account
                    </Link>
                </div>
            </div>

            <footer
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    color: '#6366f1', // Indigo-500
                    fontSize: '0.875rem',
                }}
            >
                &copy; {new Date().getFullYear()} ERP Core System. All rights reserved.
            </footer>
        </div>
    );
}
