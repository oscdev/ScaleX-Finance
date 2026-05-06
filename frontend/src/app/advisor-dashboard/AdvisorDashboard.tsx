'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { strapiPublicApi } from '@/lib/strapi';
import './AdvisorDashboard.css';

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
            const token = localStorage.getItem('advisorToken');

            if (!token) {
                router.push('/advisor-login');
                return;
            }

            const userRes = await fetch(strapiPublicApi('/api/users/me'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userRes.ok) {
                throw new Error('Authentication failed');
            }

            const userData = await userRes.json();

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
            setError(err.message);
            localStorage.removeItem('advisorToken');
            router.push('/advisor-login');
        }
    };

    const fetchLeads = async (advisorId: string, token: string) => {
        try {
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
            setError(err.message);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('advisorToken');
        router.push('/');
    };

    const handleAddNewLead = () => {
        if (advisor) {
            sessionStorage.setItem('advisorReferralId', advisor.id);
        }
        router.push('/products');
    };

    if (loading) {
        return (
            <section className="form-section centered-view">
                <div className="container">
                    <h2>Loading...</h2>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="form-section centered-view">
                <div className="container">
                    <h2 className="error-title">Error</h2>
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
            <section className="hero-section hero-section-dashboard">
                <div className="container">
                    <div className="dashboard-header">
                        <div>
                            <h1 className="dashboard-title">
                                Welcome, {advisor?.attributes?.fullName || 'Advisor'}
                            </h1>
                            <p className="dashboard-subtitle">
                                Advisor ID: {advisor?.id}
                            </p>
                        </div>
                        <button className="btn btn-secondary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>

                    <div className="dashboard-actions">
                        <button className="btn btn-primary" onClick={handleAddNewLead}>
                            + Add New Lead
                        </button>
                    </div>
                </div>
            </section>

            <section className="form-section form-section-dashboard">
                <div className="container">
                    <h2 className="leads-heading">My Leads ({leads.length})</h2>

                    {leads.length === 0 ? (
                        <div className="card no-leads-message">
                            <p>No leads found. Click "Add New Lead" to get started.</p>
                        </div>
                    ) : (
                        <div className="leads-container">
                            {leads.map((lead) => (
                                <div key={lead.id} className="card lead-card">
                                    <div className="lead-grid">
                                        <div>
                                            <div className="lead-item-label">Customer Name</div>
                                            <div className="lead-item-value">{lead.attributes.fullName}</div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Email</div>
                                            <div className="lead-item-value">{lead.attributes.email}</div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Mobile</div>
                                            <div className="lead-item-value">{lead.attributes.mobileNumber}</div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Required Amount</div>
                                            <div className="lead-item-value lead-amount">
                                                ₹{lead.attributes.requiredAmount.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Credit Score</div>
                                            <div className="lead-item-value">{lead.attributes.creditScore}</div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Employment Type</div>
                                            <div className="lead-item-value">{lead.attributes.employmentType}</div>
                                        </div>
                                        <div>
                                            <div className="lead-item-label">Submitted Date</div>
                                            <div className="lead-item-value">{new Date(lead.attributes.createdAt).toLocaleDateString('en-IN')}</div>
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
