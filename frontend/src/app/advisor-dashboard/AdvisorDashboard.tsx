'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { strapiPublicApi } from '@/lib/strapi';

interface Lead {
    id: number;
    attributes: {
        fullName: string;
        email: string;
        mobileNumber: string;
        requiredAmount: number;
        creditScore: number;
        employmentType: string;
        createdAt: string;
        advisorReferralId: string;
    };
}

export default function AdvisorDashboard() {
    const router = useRouter();
    const [advisor, setAdvisor] = useState<any>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Get JWT token from localStorage
            const token = localStorage.getItem('advisorToken');

            if (!token) {
                router.push('/advisor-login');
                return;
            }

            // Verify token and get advisor data
            const userRes = await fetch(strapiPublicApi('/api/users/me'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userRes.ok) {
                throw new Error('Authentication failed');
            }

            const userData = await userRes.json();

            // Get advisor profile linked to this user
            const advisorRes = await fetch(strapiPublicApi(`/api/advisors?filters[user][id][$eq]=${userData.id}&populate=*`), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!advisorRes.ok) {
                throw new Error('Failed to fetch advisor profile');
            }

            const advisorData = await advisorRes.json();

            if (advisorData.data && advisorData.data.length > 0) {
                const advisorProfile = advisorData.data[0];
                setAdvisor(advisorProfile);
                fetchLeads(advisorProfile.id, token);
            } else {
                setError('No advisor profile found');
                setLoading(false);
            }

        } catch (err: any) {
            // console.error('Auth error:', err);
            setError(err.message);
            localStorage.removeItem('advisorToken');
            router.push('/advisor-login');
        }
    };

    const fetchLeads = async (advisorId: string, token: string) => {
        try {
            // Fetch leads where advisorReferralId matches this advisor's ID
            const res = await fetch(strapiPublicApi(`/api/leads?filters[advisorReferralId][$eq]=${advisorId}&sort=createdAt:desc`), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch leads');
            }

            const data = await res.json();
            setLeads(data.data || []);
            setLoading(false);

        } catch (err: any) {
            // console.error('Fetch leads error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('advisorToken');
        router.push('/');
    };

    const handleAddNewLead = () => {
        // Store advisor ID in sessionStorage to auto-populate lead form
        if (advisor) {
            sessionStorage.setItem('advisorReferralId', advisor.id);
        }
        router.push('/products');
    };

    if (loading) {
        return (
            <section className="form-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2>Loading...</h2>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="form-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--secondary)' }}>Error</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => router.push('/')}>
                        Go Home
                    </button>
                </div>
            </section>
        );
    }

    return (
        <>
            <section className="hero-section" style={{ padding: '4rem 0 2rem 0' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                                Welcome, {advisor?.attributes?.fullName || 'Advisor'}
                            </h1>
                            <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>
                                Advisor ID: {advisor?.id}
                            </p>
                        </div>
                        <button className="btn btn-secondary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn btn-primary" onClick={handleAddNewLead}>
                            + Add New Lead
                        </button>
                    </div>
                </div>
            </section>

            <section className="form-section" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <div className="container">
                    <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>My Leads ({leads.length})</h2>

                    {leads.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                            <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>No leads found. Click "Add New Lead" to get started.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {leads.map((lead) => (
                                <div key={lead.id} className="card" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Customer Name</div>
                                            <div style={{ fontWeight: 600 }}>{lead.attributes.fullName}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Email</div>
                                            <div>{lead.attributes.email}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Mobile</div>
                                            <div>{lead.attributes.mobileNumber}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Required Amount</div>
                                            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                ₹{lead.attributes.requiredAmount.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Credit Score</div>
                                            <div>{lead.attributes.creditScore}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Employment Type</div>
                                            <div>{lead.attributes.employmentType}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>Submitted Date</div>
                                            <div>{new Date(lead.attributes.createdAt).toLocaleDateString('en-IN')}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
