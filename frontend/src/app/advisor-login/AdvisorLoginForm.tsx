'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { strapiPublicApi } from '@/lib/strapi';

import { logEvent } from '@/lib/logger';

export default function AdvisorLoginForm() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Authenticate with Strapi
            const res = await fetch(strapiPublicApi('/api/auth/local'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: formData.email,
                    password: formData.password
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const failMsg = errorData?.error?.message || 'Invalid email or password';

                // 🛑 Audit Log: Failed Login
                await logEvent({
                    action: 'ADVISOR_LOGIN_FAILURE',
                    description: `Failed login attempt for ${formData.email}`,
                    severity: 'warning',
                    metadata: { email: formData.email, error: failMsg }
                });

                throw new Error(failMsg);
            }

            const data = await res.json();

            // 🟢 Audit Log: Successful Login
            await logEvent({
                action: 'ADVISOR_LOGIN_SUCCESS',
                description: `Successful login for ${formData.email}`,
                severity: 'info',
                userId: data.user?.id?.toString(),
                metadata: { email: formData.email }
            });

            // Store JWT token
            localStorage.setItem('advisorToken', data.jwt);

            // Redirect to advisor dashboard
            router.push('/advisor-dashboard');

        } catch (err: any) {
            // console.error('Login error:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'rgba(255,255,255,0.05)',
        color: 'inherit',
        fontSize: '1rem',
        marginTop: '0.5rem',
        marginBottom: '0.25rem',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.3s ease'
    };

    const labelStyle = {
        fontWeight: 500,
        fontSize: '0.9rem',
        opacity: 0.9,
        display: 'block',
        marginTop: '1.5rem'
    };

    const errorStyle = {
        color: 'var(--secondary)',
        fontSize: '0.9rem',
        marginBottom: '1rem',
        textAlign: 'center' as const
    };

    return (
        <section className="form-section" style={{ minHeight: '60vh', paddingBottom: '4rem' }}>
            <div className="container animate-fade-in delay-200" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <form className="card" onSubmit={handleSubmit} style={{ padding: '3rem' }}>

                    {error && <div style={errorStyle}>{error}</div>}

                    <div>
                        <label style={labelStyle}>Email Address</label>
                        <input
                            style={inputStyle}
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Password</label>
                        <input
                            style={inputStyle}
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            marginTop: '2rem',
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.8 }}>
                        Don't have an account? <a href="/advisor-onboarding" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Register here</a>
                    </div>

                </form>
            </div>
        </section>
    );
}
