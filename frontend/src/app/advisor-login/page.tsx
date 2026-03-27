import React from 'react';
export const dynamic = 'force-dynamic';
import AdvisorLoginForm from './AdvisorLoginForm';

export default function AdvisorLoginPage() {
    return (
        <>
            <section className="hero-section" style={{ padding: '6rem 0 4rem 0' }}>
                <div className="container animate-fade-in">
                    <h1 className="hero-title" style={{ fontSize: '3rem' }}>Advisor Login</h1>
                    <p className="hero-subtitle delay-100">Access your advisor dashboard</p>
                </div>
            </section>

            <AdvisorLoginForm />
        </>
    );
}
