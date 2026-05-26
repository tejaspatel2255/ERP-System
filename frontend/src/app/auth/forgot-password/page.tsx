'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to request OTP');

            setMessage(data.message || 'OTP sent to your email.');
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', textAlign: 'center' }}>
                Forgot Password
            </h2>
            <p
                style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                }}
            >
                {step === 1 ? 'Enter your email to receive a recovery OTP.' : 'Enter the OTP and your new password.'}
            </p>

            {error && (
                <div
                    style={{
                        background: '#FEF2F2',
                        color: '#B91C1C',
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                    }}
                >
                    {error}
                </div>
            )}

            {message && !error && (
                <div
                    style={{
                        background: '#F0FDF4',
                        color: '#15803D',
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                    }}
                >
                    {message}
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleSendOTP}>
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="admin@example.com"
                    />

                    <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        Send Recovery OTP
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword}>
                    <Input
                        label="6-Digit OTP"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        maxLength={6}
                        placeholder="123456"
                    />

                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />

                    <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        Reset Password
                    </Button>
                </form>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>
                    Remember your password?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        Back to Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
