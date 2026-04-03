'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { strapiPublicApi } from '@/lib/strapi';

import { logEvent } from '@/lib/logger';
import './AdvisorLogin.css';

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

                await logEvent({
                    action: 'ADVISOR_LOGIN_FAILURE',
                    description: `Failed login attempt for ${formData.email}`,
                    severity: 'warning',
                    metadata: { email: formData.email, error: failMsg }
                });

                throw new Error(failMsg);
            }

            const data = await res.json();

            await logEvent({
                action: 'ADVISOR_LOGIN_SUCCESS',
                description: `Successful login for ${formData.email}`,
                severity: 'info',
                userId: data.user?.id?.toString(),
                metadata: { email: formData.email }
            });

            localStorage.setItem('advisorToken', data.jwt);
            router.push('/advisor-dashboard');

        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="login-section">
            <div className="login-container animate-fade-in delay-200">
                <form className="card login-card" onSubmit={handleSubmit}>

                    {error && <div className="login-error">{error}</div>}

                    <div>
                        <label className="login-label">Email Address</label>
                        <input
                            className="login-input"
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label className="login-label">Password</label>
                        <input
                            className="login-input"
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
                        className={`btn btn-primary login-submit-btn ${isSubmitting ? 'btn-disabled' : ''}`}
                        disabled={isSubmitting}
                        style={{ marginTop: '2rem' }}
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="login-footer">
                        Don't have an account? <a href="/advisor-onboarding" className="login-link">Register here</a>
                    </div>

                </form>
            </div>
        </section>
    );
}
