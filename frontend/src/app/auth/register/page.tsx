'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        mobile: '',
        password: '',
        retypePassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        upper: false,
        lower: false,
        digit: false,
        special: false,
    });

    useEffect(() => {
        const p = formData.password;
        setPasswordCriteria({
            length: p.length >= 8,
            upper: /[A-Z]/.test(p),
            lower: /[a-z]/.test(p),
            digit: /\d/.test(p),
            special: /[@$!%*?&]/.test(p),
        });
    }, [formData.password]);

    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    const isFormValid =
        isPasswordValid &&
        formData.password === formData.retypePassword &&
        formData.username &&
        formData.name &&
        formData.email &&
        formData.mobile.length === 10;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.username || !formData.name || !formData.email || !formData.mobile || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.mobile.length !== 10) {
            setError('Mobile number must be exactly 10 digits');
            return;
        }

        if (!isPasswordValid) {
            setError('Password does not meet requirements');
            return;
        }

        if (formData.password !== formData.retypePassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Redirect to OTP with email query param
            router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>
                Create Account
            </h2>

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

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Input
                        label="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        placeholder="jdoe"
                    />
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="John Doe"
                    />
                </div>

                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                />

                <Input
                    label="Mobile Number"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, mobile: val });
                    }}
                    required
                    placeholder="1234567890"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <Input
                        label="Retype Password"
                        type="password"
                        value={formData.retypePassword}
                        onChange={(e) => setFormData({ ...formData, retypePassword: e.target.value })}
                        required
                        style={{
                            borderColor:
                                formData.retypePassword && formData.password !== formData.retypePassword
                                    ? 'var(--error)'
                                    : 'var(--border)',
                        }}
                    />
                </div>

                {/* Password Strength Indicator */}
                <div
                    style={{
                        marginBottom: '1.5rem',
                        padding: '0.75rem',
                        background: 'var(--bg-color)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                    }}
                >
                    <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Password Requirements:</p>
                    <ul
                        style={{
                            listStyle: 'none',
                            paddingLeft: 0,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.25rem',
                        }}
                    >
                        <li style={{ color: passwordCriteria.length ? 'var(--success)' : 'var(--text-muted)' }}>
                            {passwordCriteria.length ? '✓' : '•'} Min 8 chars
                        </li>
                        <li style={{ color: passwordCriteria.upper ? 'var(--success)' : 'var(--text-muted)' }}>
                            {passwordCriteria.upper ? '✓' : '•'} Uppercase
                        </li>
                        <li style={{ color: passwordCriteria.lower ? 'var(--success)' : 'var(--text-muted)' }}>
                            {passwordCriteria.lower ? '✓' : '•'} Lowercase
                        </li>
                        <li style={{ color: passwordCriteria.digit ? 'var(--success)' : 'var(--text-muted)' }}>
                            {passwordCriteria.digit ? '✓' : '•'} Number
                        </li>
                        <li style={{ color: passwordCriteria.special ? 'var(--success)' : 'var(--text-muted)' }}>
                            {passwordCriteria.special ? '✓' : '•'} Special char
                        </li>
                    </ul>
                </div>

                <Button
                    type="submit"
                    isLoading={loading}
                    // disabled={!isFormValid} // Enabled to show validation errors
                    style={{ width: '100%' }}
                >
                    Register
                </Button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
